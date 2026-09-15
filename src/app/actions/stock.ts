"use server";

import db from "@/lib/db";

function generateRequestNo(count: number): string {
  return `PR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

function generateTaskCode(count: number): string {
  return `TSK-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

export async function updateProductImage(productId: string, imageUrl: string) {
  return await db.product.update({
    where: { id: productId },
    data: { imageUrl }
  });
}

/**
 * STK-01/STK-02: Reserve stock for an order line — atomic, no over-allocation.
 */
export async function reserveStock(data: {
  orderLineId: string;
  productId: string;
  warehouseCode: string;
  qty: number;
  requestedById?: string;
}) {
  const company = await db.company.findFirst();
  if (!company) throw new Error("Company not configured");

  return await db.$transaction(async (tx) => {
    // Lock the inventory balance row
    const balance = await tx.inventoryBalance.findUnique({
      where: {
        productId_warehouseCode_condition: {
          productId: data.productId,
          warehouseCode: data.warehouseCode,
          condition: "USABLE",
        },
      },
    });

    if (!balance) throw new Error("No inventory balance record found for this product/warehouse");

    const available = balance.physicalQty - balance.reservedQty - balance.holdQty;
    if (available < data.qty) {
      throw new Error(
        `Insufficient stock. Available: ${available}, Requested: ${data.qty}. Consider requesting production.`
      );
    }

    // Update balance
    await tx.inventoryBalance.update({
      where: {
        productId_warehouseCode_condition: {
          productId: data.productId,
          warehouseCode: data.warehouseCode,
          condition: "USABLE",
        },
      },
      data: { reservedQty: balance.reservedQty + data.qty },
    });

    // Create reservation record
    const reservation = await tx.reservation.create({
      data: {
        orderLineId: data.orderLineId,
        productId: data.productId,
        warehouseCode: data.warehouseCode,
        reservedQty: data.qty,
        status: "ACTIVE",
      },
    });

    // Update order line status
    const orderLine = await tx.orderLine.findUnique({ where: { id: data.orderLineId } });
    if (orderLine) {
      const newAllocated = orderLine.allocatedQty + data.qty;
      const isFullyAllocated = newAllocated >= orderLine.orderedQty - orderLine.cancelledQty;
      await tx.orderLine.update({
        where: { id: data.orderLineId },
        data: {
          allocatedQty: newAllocated,
          stockStatus: isFullyAllocated ? "FULLY_ALLOCATED" : "PARTIALLY_ALLOCATED",
          fulfilmentStatus: isFullyAllocated ? "READY" : "PENDING",
        },
      });
    }

    // Record inventory movement (not a physical move yet — a logical hold)
    await tx.inventoryMovement.create({
      data: {
        productId: data.productId,
        warehouseCode: data.warehouseCode,
        movementType: "RESERVATION",
        qty: data.qty,
        sourceRef: data.orderLineId,
        sourceRefType: "OrderLine",
        actorId: data.requestedById,
        notes: `Reserved for order line ${data.orderLineId}`,
      },
    });

    return reservation;
  });
}

/**
 * Get inventory grid — stock levels with reservation breakdown
 */
export async function getInventoryGrid(search?: string, page = 1, pageSize = 25) {
  const where: any = { isActive: true };
  if (search) {
    where.OR = [
      { sku: { contains: search } },
      { name: { contains: search } },
      { category: { contains: search } },
    ];
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        inventoryBalances: true,
        reorderPolicies: { where: { isActive: true } },
        priceListItems: { where: { effectiveUntil: null }, orderBy: { effectiveFrom: "desc" }, take: 1 },
      },
      orderBy: [{ category: "asc" }, { sku: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return {
    products: products.map((p) => {
      const fg = p.inventoryBalances.find((b) => b.warehouseCode === "FINISHED_GOODS") ?? null;
      const policy = p.reorderPolicies[0] ?? null;
      const latestPrice = p.priceListItems[0]?.price ?? 0;

      return {
        ...p,
        physical: fg?.physicalQty ?? 0,
        reserved: fg?.reservedQty ?? 0,
        held: fg?.holdQty ?? 0,
        available: fg ? fg.physicalQty - fg.reservedQty - fg.holdQty : 0,
        minimum: policy?.minimumQty ?? null,
        isBelowMinimum:
          policy?.minimumQty != null && fg
            ? fg.physicalQty - fg.reservedQty < policy.minimumQty
            : false,
        latestPrice,
      };
    }),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

/**
 * Get all products with stock issues awaiting import review
 */
export async function getStockImportReview() {
  return await db.product.findMany({
    where: {
      OR: [
        { importFlags: { contains: "count_unknown" } },
        { importFlags: { contains: "duplicate_code" } },
        { importFlags: { contains: "placeholder" } },
        { isActive: false },
      ],
    },
    include: {
      inventoryBalances: true,
      reorderPolicies: true,
    },
    orderBy: [{ importBlock: "asc" }, { importRow: "asc" }],
  });
}

/**
 * Approve a product and activate it after stock verification
 */
export async function activateProduct(productId: string, verifiedQty: number, approvedById?: string) {
  const company = await db.company.findFirst();

  return await db.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id: productId },
      data: { isActive: true },
    });

    // Set verified opening balance
    await tx.inventoryBalance.upsert({
      where: {
        productId_warehouseCode_condition: {
          productId,
          warehouseCode: "FINISHED_GOODS",
          condition: "USABLE",
        },
      },
      update: { physicalQty: verifiedQty },
      create: {
        productId,
        warehouseCode: "FINISHED_GOODS",
        condition: "USABLE",
        physicalQty: verifiedQty,
        reservedQty: 0,
        holdQty: 0,
      },
    });

    // Record opening balance movement
    await tx.inventoryMovement.create({
      data: {
        productId,
        warehouseCode: "FINISHED_GOODS",
        movementType: "OPENING_BALANCE",
        qty: verifiedQty,
        notes: "Verified opening balance from stock import",
        actorId: approvedById,
      },
    });

    if (company) {
      await tx.auditEvent.create({
        data: {
          companyId: company.id,
          actorId: approvedById,
          entityType: "Product",
          entityId: productId,
          action: "ACTIVATED",
          newValues: JSON.stringify({ sku: product.sku, verifiedQty }),
        },
      });
    }

    return product;
  });
}

/**
 * Create a Production Request from Stock for shortage items
 */
export async function requestProduction(data: {
  orderId?: string;
  purpose: string;
  priority?: string;
  dueDate?: string;
  notes?: string;
  requestedById?: string;
  lines: Array<{
    orderLineId?: string;
    productId?: string;
    description: string;
    requestedQty: number;
    uom?: string;
  }>;
}) {
  const company = await db.company.findFirst();
  if (!company) throw new Error("Company not configured");

  const count = await db.productionRequest.count();
  const requestNo = generateRequestNo(count);

  return await db.$transaction(async (tx) => {
    const request = await tx.productionRequest.create({
      data: {
        requestNo,
        orderId: data.orderId,
        purpose: data.purpose,
        requestedById: data.requestedById,
        status: "SUBMITTED",
        priority: data.priority ?? "NORMAL",
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
        lines: {
          create: data.lines.map((l) => ({
            orderLineId: l.orderLineId,
            productId: l.productId,
            description: l.description,
            requestedQty: l.requestedQty,
            uom: l.uom ?? "NOS",
          })),
        },
      },
      include: { lines: true },
    });

    // Update order line production status if linked to order
    if (data.orderId) {
      for (const line of data.lines) {
        if (line.orderLineId) {
          await tx.orderLine.update({
            where: { id: line.orderLineId },
            data: { productionStatus: "REQUESTED" },
          });
        }
      }
    }

    // Notify Production Manager
    const prodManager = await tx.employee.findFirst({
      where: {
        roleAssignments: { some: { role: { name: "Production_Supervisor" }, active: true } },
        status: "ACTIVE",
      },
    });

    if (prodManager) {
      const taskCount = await tx.task.count();
      await tx.task.create({
        data: {
          taskCode: generateTaskCode(taskCount),
          type: "PRODUCTION_REQUEST",
          assignerId: data.requestedById,
          assigneeId: prodManager.id,
          status: "ASSIGNED",
          priority: data.priority ?? "NORMAL",
          dueAt: data.dueDate ? new Date(data.dueDate) : undefined,
          instructions: `Production request ${requestNo} from Stock. ${data.lines.length} item(s). Purpose: ${data.purpose}.`,
          sourceDept: "Stock",
          destDept: "Production",
        },
      });

      await tx.notification.create({
        data: {
          companyId: company.id,
          recipientId: prodManager.id,
          eventType: "PRODUCTION_REQUEST",
          title: `Production Request: ${requestNo}`,
          message: `Stock has requested production of ${data.lines.length} item(s). Priority: ${data.priority ?? "NORMAL"}.`,
          targetRef: request.id,
          targetRefType: "ProductionRequest",
        },
      });
    }

    return request;
  });
}

/**
 * Stock dashboard: inventory overview, shortages, pending receipts
 */
export async function getStockDashboard() {
  const [
    totalProducts,
    activeProducts,
    belowMinimum,
    unknownCount,
    pendingReceipts,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { isActive: true } }),
    db.product.count({
      where: {
        isActive: true,
        reorderPolicies: {
          some: {
            isActive: true,
            minimumQty: { not: null },
          },
        },
      },
    }),
    db.product.count({ where: { importFlags: { contains: "count_unknown" } } }),
    db.productionHandover.count({ where: { status: "READY" } }),
  ]);

  const recentMovements = await db.inventoryMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    totalProducts,
    activeProducts,
    belowMinimum,
    unknownCount,
    pendingReceipts,
    recentMovements,
  };
}

/**
 * Receive production handover into stock
 */
export async function receiveProductionHandover(data: {
  handoverId: string;
  acceptedQty: number;
  rejectedQty: number;
  discrepancyNote?: string;
  receivedById?: string;
}) {
  const company = await db.company.findFirst();

  return await db.$transaction(async (tx) => {
    const handover = await tx.productionHandover.findUnique({
      where: { id: data.handoverId },
      include: { job: { include: { request: { include: { lines: true } } } } },
    });
    if (!handover) throw new Error("Handover not found");
    if (handover.status !== "READY" && handover.status !== "PROPOSED") {
      throw new Error("Handover is not in a receivable state");
    }

    const total = data.acceptedQty + data.rejectedQty;
    if (total > handover.offeredQty) {
      throw new Error("Accepted + rejected cannot exceed offered quantity");
    }

    // Update handover
    await tx.productionHandover.update({
      where: { id: data.handoverId },
      data: {
        status: data.rejectedQty > 0 ? "PARTIALLY_ACCEPTED" : "ACCEPTED",
        acceptedQty: data.acceptedQty,
        rejectedQty: data.rejectedQty,
        discrepancyNote: data.discrepancyNote,
        stockRecipientId: data.receivedById,
        receivedAt: new Date(),
      },
    });

    // Post inventory movement for accepted qty
    if (data.acceptedQty > 0) {
      // Find which product from job request
      const requestLine = handover.job.request?.lines[0];
      if (requestLine?.productId) {
        // Update inventory balance
        const balance = await tx.inventoryBalance.findUnique({
          where: {
            productId_warehouseCode_condition: {
              productId: requestLine.productId,
              warehouseCode: "FINISHED_GOODS",
              condition: "USABLE",
            },
          },
        });

        if (balance) {
          await tx.inventoryBalance.update({
            where: {
              productId_warehouseCode_condition: {
                productId: requestLine.productId,
                warehouseCode: "FINISHED_GOODS",
                condition: "USABLE",
              },
            },
            data: { physicalQty: balance.physicalQty + data.acceptedQty },
          });
        } else {
          await tx.inventoryBalance.create({
            data: {
              productId: requestLine.productId,
              warehouseCode: "FINISHED_GOODS",
              condition: "USABLE",
              physicalQty: data.acceptedQty,
              reservedQty: 0,
              holdQty: 0,
            },
          });
        }

        await tx.inventoryMovement.create({
          data: {
            productId: requestLine.productId,
            warehouseCode: "FINISHED_GOODS",
            movementType: "PRODUCTION_RECEIPT",
            qty: data.acceptedQty,
            sourceRef: handover.jobId,
            sourceRefType: "ProductionJob",
            actorId: data.receivedById,
            notes: `Received from production job handover ${data.handoverId}`,
          },
        });
      }
    }

    return handover;
  });
}

/**
 * Fetch orders that are waiting for stock assessment
 */
export async function getPendingStockAssessments() {
  return await db.order.findMany({
    where: {
      commercialStatus: "CONFIRMED", // After Finance Review, status is CONFIRMED
      OR: [
        { lines: { some: { stockStatus: "PENDING_ASSESSMENT" } } },
        { lines: { some: { stockStatus: "PARTIALLY_ALLOCATED" } } },
      ],
    },
    include: {
      customer: true,
      lines: {
        include: {
          product: {
            include: {
              inventoryBalances: { where: { warehouseCode: "FINISHED_GOODS" } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Mark order stock as fully assessed and ready for dispatch if fully allocated
 */
export async function markOrderReady(orderId: string, actorId: string) {
  return await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });
    if (!order) throw new Error("Order not found");

    const fullyAllocated = order.lines.every(
      (l) => l.allocatedQty >= l.orderedQty - l.cancelledQty
    );
    
    // If fully allocated, set line fulfilment to READY
    if (fullyAllocated) {
      await tx.orderLine.updateMany({
        where: { orderId: orderId },
        data: { fulfilmentStatus: "READY" },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { fulfilmentStatus: "READY" },
      });
    }

    return fullyAllocated;
  });
}
