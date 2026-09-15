"use server";

import db from "@/lib/db";

function generateOrderNo(count: number): string {
  const year = new Date().getFullYear();
  const next = String(count + 1).padStart(6, "0");
  return `HC/${year - 2000}-${String(year - 2000 + 1)}/${next}`;
}

function generateTaskCode(count: number): string {
  return `TSK-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

function generateLeadCode(count: number): string {
  return `LEAD-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Create a new lead for a customer.
 */
export async function createLead(data: {
  customerId: string;
  source?: string;
  requirementSummary?: string;
  nextFollowUp?: string;
  expectedValue?: number;
  ownerEmployeeId?: string;
}) {
  const count = await db.lead.count();
  return await db.lead.create({
    data: {
      leadCode: generateLeadCode(count),
      customerId: data.customerId,
      source: data.source ?? "PHONE",
      stage: "NEW",
      requirementSummary: data.requirementSummary,
      nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : undefined,
      expectedValue: data.expectedValue,
      ownerEmployeeId: data.ownerEmployeeId,
    },
    include: { customer: true },
  });
}

export async function getLeads(filter?: { stage?: string; ownerId?: string }) {
  return await db.lead.findMany({
    where: {
      ...(filter?.stage ? { stage: filter.stage } : {}),
      ...(filter?.ownerId ? { ownerEmployeeId: filter.ownerId } : {}),
    },
    include: {
      customer: { include: { contacts: true } },
      quotations: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateLeadStage(leadId: string, stage: string, reason?: string) {
  const lead = await db.lead.update({
    where: { id: leadId },
    data: { stage, ...(stage === "LOST" ? { lostReason: reason } : {}) },
  });

  await db.leadActivity.create({
    data: {
      leadId,
      type: "STATUS_CHANGE",
      description: `Stage changed to ${stage}${reason ? `: ${reason}` : ""}`,
    },
  });

  return lead;
}

/**
 * SALE-03: Confirm order.
 * Creates an Order with Lines and a Finance task for advance receipt.
 * Does NOT automatically create Production tasks — that is Finance's job after advance clearance.
 */
export async function confirmOrder(data: {
  customerId: string;
  leadId?: string;
  lines: Array<{
    itemType: "CATALOGUE" | "CUSTOM" | "SERVICE";
    productId?: string;
    description: string;
    hsnSac?: string;
    quantity: number;
    uom?: string;
    unitPrice: number;
    discountPercent?: number;
    taxSgstPercent?: number;
    taxCgstPercent?: number;
    taxIgstPercent?: number;
    promisedDate?: string;
    specData?: {
      material?: string;
      dimensions?: string;
      finish?: string;
      colour?: string;
      artworkText?: string;
    };
  }>;
  promiseDate?: string;
  advanceRequired?: number;
  advancePercent?: number;
  buyerReference?: string;
  ownerEmployeeId?: string;
  notes?: string;
}) {
  const company = await db.company.findFirst();
  if (!company) throw new Error("Company not configured");

  const customer = await db.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) throw new Error("Customer not found");
  if (customer.creditStatus === "BLOCKED") {
    throw new Error("Customer account is blocked. Contact Finance.");
  }

  // Compute order financials
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;
  const computedLines = data.lines.map((line, idx) => {
    const gross = line.quantity * line.unitPrice;
    const disc = gross * ((line.discountPercent ?? 0) / 100);
    const taxable = gross - disc;
    const sgst = taxable * ((line.taxSgstPercent ?? 0) / 100);
    const cgst = taxable * ((line.taxCgstPercent ?? 0) / 100);
    const igst = taxable * ((line.taxIgstPercent ?? 0) / 100);
    const tax = sgst + cgst + igst;
    const lineTotal = taxable + tax;
    subtotal += taxable;
    discountAmount += disc;
    taxAmount += tax;
    return { ...line, lineNumber: idx + 1, taxableAmount: taxable, taxAmount: tax, lineTotal, discountAmount: disc };
  });

  const totalPayable = subtotal + taxAmount;
  const advanceRequired = data.advanceRequired ?? Math.ceil(totalPayable * ((data.advancePercent ?? 30) / 100));

  const orderCount = await db.order.count();
  const orderNo = generateOrderNo(orderCount);

  return await db.$transaction(async (tx) => {
    // 1. Create Order header
    const order = await tx.order.create({
      data: {
        companyId: company.id,
        orderNo,
        customerId: data.customerId,
        ownerEmployeeId: data.ownerEmployeeId,
        commercialStatus: "CONFIRMED",
        fulfilmentStatus: "NOT_RELEASED",
        paymentStatus: "NO_PAYMENT",
        dispatchAuthStatus: "BLOCKED",
        currentRevision: 1,
        promiseDate: data.promiseDate ? new Date(data.promiseDate) : undefined,
        buyerReference: data.buyerReference,
        subtotal,
        discountAmount,
        taxAmount,
        totalPayable,
        advanceRequired,
      },
    });

    // 2. Create order revision snapshot
    await tx.orderRevision.create({
      data: {
        orderId: order.id,
        revisionNumber: 1,
        totalPayable,
        advanceRequired,
        notes: data.notes,
      },
    });

    // 3. Create order lines + specification versions for custom items
    for (const line of computedLines) {
      let specId: string | undefined;

      if (line.itemType === "CUSTOM" && line.specData) {
        const spec = await tx.specificationVersion.create({
          data: {
            title: line.description,
            material: line.specData.material,
            dimensions: line.specData.dimensions,
            finish: line.specData.finish,
            colour: line.specData.colour,
            artworkText: line.specData.artworkText,
            revisionNumber: 1,
          },
        });
        specId = spec.id;
      }

      // Validate catalogue product exists
      if (line.itemType === "CATALOGUE" && line.productId) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product || !product.isActive) {
          throw new Error(`Product ${line.productId} not found or not active`);
        }
      }

      await tx.orderLine.create({
        data: {
          orderId: order.id,
          lineNumber: line.lineNumber,
          itemType: line.itemType,
          productId: line.itemType === "CATALOGUE" ? line.productId : undefined,
          specificationId: specId,
          description: line.description,
          hsnSac: line.hsnSac,
          orderedQty: line.quantity,
          uom: line.uom ?? "NOS",
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent ?? 0,
          taxSgstPercent: line.taxSgstPercent ?? 0,
          taxCgstPercent: line.taxCgstPercent ?? 0,
          taxIgstPercent: line.taxIgstPercent ?? 0,
          taxableAmount: line.taxableAmount,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,
          promisedDate: line.promisedDate ? new Date(line.promisedDate) : undefined,
          stockStatus: "PENDING",
          productionStatus: line.itemType === "CUSTOM" ? "REQUESTED" : "NOT_NEEDED",
          qcStatus: line.itemType === "CUSTOM" ? "PENDING" : "NOT_NEEDED",
          fulfilmentStatus: "PENDING",
        },
      });
    }

    // 4. Create Finance task to collect advance
    // Finance must review and collect advance BEFORE Stock releases fulfilment
    const taskCount = await tx.task.count();
    const financeEmployee = await tx.employee.findFirst({
      where: {
        roleAssignments: { some: { role: { name: "Finance" }, active: true } },
        status: "ACTIVE",
      },
    });

    const task = await tx.task.create({
      data: {
        taskCode: generateTaskCode(taskCount),
        type: "FINANCE_REVIEW",
        orderId: order.id,
        assignerId: data.ownerEmployeeId,
        assigneeId: financeEmployee?.id,
        status: "ASSIGNED",
        priority: "NORMAL",
        dueAt: data.promiseDate ? new Date(data.promiseDate) : undefined,
        instructions: `Review order ${orderNo}. Collect advance of ₹${advanceRequired.toLocaleString("en-IN")} before releasing to Stock.`,
        sourceDept: "Sales",
        destDept: "Finance",
      },
    });

    // 5. Create notification for Finance team
    if (financeEmployee) {
      await tx.notification.create({
        data: {
          companyId: company.id,
          recipientId: financeEmployee.id,
          eventType: "ORDER_CONFIRMED",
          title: `New Order: ${orderNo}`,
          message: `Order from ${customer.displayName} — ₹${totalPayable.toLocaleString("en-IN")} — Advance required: ₹${advanceRequired.toLocaleString("en-IN")}`,
          targetRef: order.id,
          targetRefType: "Order",
        },
      });
    }

    // 6. Audit event
    await tx.auditEvent.create({
      data: {
        companyId: company.id,
        actorId: data.ownerEmployeeId,
        entityType: "Order",
        entityId: order.id,
        action: "CONFIRMED",
        newValues: JSON.stringify({ orderNo, totalPayable, commercialStatus: "CONFIRMED" }),
      },
    });

    return { order, taskId: task.id };
  });
}

export async function getSalesOrders(filter?: {
  status?: string;
  customerId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = filter?.page ?? 1;
  const pageSize = filter?.pageSize ?? 25;

  const where: any = {};
  if (filter?.status) where.commercialStatus = filter.status;
  if (filter?.customerId) where.customerId = filter.customerId;

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        customer: { include: { contacts: true } },
        lines: { include: { product: true } },
        payments: true,
        shipments: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.order.count({ where }),
  ]);

  return { orders, total, page, pageSize, hasMore: page * pageSize < total };
}

export async function getOrderById(orderId: string) {
  return await db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { include: { contacts: true, addresses: true, taxProfiles: true } },
      lines: {
        include: {
          product: true,
          specification: true,
          reservations: true,
          productionRequestLines: { include: { request: true } },
        },
      },
      payments: true,
      financialClearances: true,
      productionRequests: { include: { lines: true, jobs: true } },
      tasks: { include: { assignee: true, assigner: true, events: true } },
      shipments: { include: { lines: true } },
      invoices: { include: { lines: true } },
      revisions: { orderBy: { revisionNumber: "desc" } },
    },
  });
}

export async function getActiveProducts(search?: string) {
  return await db.product.findMany({
    where: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { sku: { contains: search } },
              { name: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      inventoryBalances: { where: { warehouseCode: "FINISHED_GOODS" } },
      priceListItems: { where: { effectiveUntil: null }, orderBy: { effectiveFrom: "desc" }, take: 1 },
    },
    orderBy: { sku: "asc" },
    take: 50,
  });
}
