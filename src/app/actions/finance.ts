"use server";

import db from "@/lib/db";

function generatePaymentNo(count: number): string {
  return `REC-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

function generateTaskCode(count: number): string {
  return `TSK-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

/**
 * FIN-01: Post a payment receipt.
 * Finance records and verifies the payment. Only after this can stock be released.
 */
export async function postPaymentReceipt(data: {
  orderId: string;
  paymentType: "ADVANCE" | "PARTIAL" | "FINAL";
  method: string;
  amount: number;
  reference?: string;
  receivedDate?: string;
  evidence?: string;
  notes?: string;
  postedById?: string;
}) {
  const order = await db.order.findUnique({
    where: { id: data.orderId },
    include: { customer: true, payments: { where: { status: "POSTED_CLEARED" } } },
  });
  if (!order) throw new Error("Order not found");

  if (order.commercialStatus === "CANCELLED") {
    throw new Error("Cannot post payment for a cancelled order");
  }

  const company = await db.company.findFirst();
  if (!company) throw new Error("Company not configured");

  const paymentCount = await db.payment.count();

  return await db.$transaction(async (tx) => {
    // FIN-02: Idempotency — check for duplicate reference
    if (data.reference) {
      const existing = await tx.payment.findFirst({
        where: { orderId: data.orderId, reference: data.reference, status: { not: "REJECTED" } },
      });
      if (existing) {
        throw new Error(`Payment with reference ${data.reference} already recorded for this order`);
      }
    }

    const payment = await tx.payment.create({
      data: {
        orderId: data.orderId,
        customerId: order.customerId,
        paymentNo: generatePaymentNo(paymentCount),
        paymentType: data.paymentType,
        method: data.method,
        amount: data.amount,
        reference: data.reference,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
        status: "POSTED_CLEARED",
        postedBy: data.postedById,
        postedAt: new Date(),
        evidence: data.evidence,
        notes: data.notes,
      },
    });

    // Compute total paid including this payment
    const previouslyPaid = order.payments.reduce((s, p) => s + p.amount, 0);
    const totalNowPaid = previouslyPaid + data.amount;

    // Determine new payment status
    let paymentStatus = "ADVANCE_PENDING";
    if (totalNowPaid >= order.totalPayable) {
      paymentStatus = "FULLY_PAID";
    } else if (totalNowPaid >= order.advanceRequired) {
      paymentStatus = "ADVANCE_CLEARED";
    } else {
      paymentStatus = "ADVANCE_PENDING";
    }

    await tx.order.update({
      where: { id: data.orderId },
      data: { paymentStatus },
    });

    // FIN-01: If advance threshold is now met, release to Stock
    // Create financial clearance and send task to Stock
    const advanceMet = totalNowPaid >= order.advanceRequired;
    let clearanceId: string | undefined;

    if (advanceMet) {
      // Create financial clearance record
      const clearance = await tx.financialClearance.create({
        data: {
          orderId: data.orderId,
          orderRevision: order.currentRevision,
          payableSnapshot: order.totalPayable,
          allocatedAmount: totalNowPaid,
          status: "CLEARED",
          clearedBy: data.postedById ?? "system",
        },
      });
      clearanceId = clearance.id;

      // Update order dispatch auth
      await tx.order.update({
        where: { id: data.orderId },
        data: {
          fulfilmentStatus: "QUEUED_FOR_STOCK",
          dispatchAuthStatus: paymentStatus === "FULLY_PAID" ? "CLEARED" : "BLOCKED",
        },
      });

      // Send task to Stock for fulfilment
      const stockEmployee = await tx.employee.findFirst({
        where: {
          roleAssignments: { some: { role: { name: "Stock" }, active: true } },
          status: "ACTIVE",
        },
      });

      const taskCount = await tx.task.count();
      await tx.task.create({
        data: {
          taskCode: generateTaskCode(taskCount),
          type: "STOCK_FULFIL",
          orderId: data.orderId,
          assignerId: data.postedById,
          assigneeId: stockEmployee?.id,
          status: "ASSIGNED",
          priority: "NORMAL",
          instructions: `Advance cleared for order ${order.orderNo}. Please allocate stock and arrange fulfilment. Advance paid: ₹${totalNowPaid.toLocaleString("en-IN")}.`,
          sourceDept: "Finance",
          destDept: "Stock",
        },
      });

      if (stockEmployee) {
        await tx.notification.create({
          data: {
            companyId: company.id,
            recipientId: stockEmployee.id,
            eventType: "ADVANCE_CLEARED",
            title: `Advance Cleared: ${order.orderNo}`,
            message: `Finance has cleared ₹${totalNowPaid.toLocaleString("en-IN")} advance. Proceed with stock allocation.`,
            targetRef: data.orderId,
            targetRefType: "Order",
          },
        });
      }
    }

    // Audit
    await tx.auditEvent.create({
      data: {
        companyId: company.id,
        actorId: data.postedById,
        entityType: "Payment",
        entityId: payment.id,
        action: "POSTED",
        newValues: JSON.stringify({
          amount: data.amount,
          method: data.method,
          totalNowPaid,
          paymentStatus,
          advanceMet,
        }),
      },
    });

    return { payment, paymentStatus, advanceMet, clearanceId };
  });
}

/**
 * Get unreviewed orders queue for Finance dashboard
 */
export async function getFinanceQueue() {
  const [pendingAdvance, pendingFinal, recentPayments] = await Promise.all([
    // Orders awaiting advance
    db.order.findMany({
      where: {
        commercialStatus: "CONFIRMED",
        paymentStatus: { in: ["NO_PAYMENT", "ADVANCE_PENDING"] },
      },
      include: {
        customer: { include: { contacts: true } },
        payments: true,
      },
      orderBy: { createdAt: "asc" },
      take: 25,
    }),
    // Orders fully fulfilled but awaiting final payment
    db.order.findMany({
      where: {
        fulfilmentStatus: { in: ["READY", "PARTIALLY_READY"] },
        paymentStatus: { in: ["ADVANCE_CLEARED", "PART_PAID"] },
      },
      include: {
        customer: { include: { contacts: true } },
        payments: true,
      },
      orderBy: { promiseDate: "asc" },
      take: 25,
    }),
    // Recent payments
    db.payment.findMany({
      include: { order: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  return { pendingAdvance, pendingFinal, recentPayments };
}

/**
 * FIN-04: Check if an order can be dispatched (final payment cleared)
 */
export async function checkDispatchClearance(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      payments: { where: { status: "POSTED_CLEARED" } },
      financialClearances: true,
    },
  });
  if (!order) throw new Error("Order not found");

  const totalPaid = order.payments.reduce((s, p) => s + p.amount, 0);
  const fullyPaid = totalPaid >= order.totalPayable;
  const activeCleared = order.financialClearances.some((c) => c.status === "CLEARED");

  return {
    canDispatch: fullyPaid && activeCleared,
    totalPayable: order.totalPayable,
    totalPaid,
    outstanding: Math.max(0, order.totalPayable - totalPaid),
    fullyPaid,
    activeCleared,
  };
}

/**
 * Release final payment clearance for dispatch authorization
 */
export async function releaseFinalClearance(orderId: string, clearedById: string) {
  const { canDispatch, outstanding } = await checkDispatchClearance(orderId);
  if (!canDispatch) {
    throw new Error(`Cannot authorize dispatch: ₹${outstanding.toLocaleString("en-IN")} outstanding`);
  }

  return await db.order.update({
    where: { id: orderId },
    data: {
      dispatchAuthStatus: "CLEARED",
      paymentStatus: "FULLY_PAID",
    },
  });
}

/**
 * Finance dashboard KPIs
 */
export async function getFinanceDashboard() {
  const company = await db.company.findFirst();
  if (!company) return null;

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    unreviewedCount,
    monthPayments,
    overdueOrders,
    outstandingTotal,
  ] = await Promise.all([
    db.order.count({
      where: { paymentStatus: { in: ["NO_PAYMENT", "ADVANCE_PENDING"] }, commercialStatus: "CONFIRMED" },
    }),
    db.payment.aggregate({
      where: { status: "POSTED_CLEARED", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    db.order.count({
      where: {
        promiseDate: { lt: today },
        paymentStatus: { not: "FULLY_PAID" },
        commercialStatus: { not: "CANCELLED" },
      },
    }),
    db.order.aggregate({
      where: { commercialStatus: { not: "CANCELLED" } },
      _sum: { totalPayable: true },
    }),
  ]);

  const totalCollected = await db.payment.aggregate({
    where: { status: "POSTED_CLEARED" },
    _sum: { amount: true },
  });

  return {
    unreviewedCount,
    monthlyCollections: monthPayments._sum.amount ?? 0,
    overdueOrders,
    totalOutstanding: (outstandingTotal._sum.totalPayable ?? 0) - (totalCollected._sum.amount ?? 0),
  };
}

/**
 * Fetch orders pending Finance Review
 */
export async function getPendingFinanceReviews() {
  return await db.order.findMany({
    where: {
      commercialStatus: "DRAFT", // Or pending finance review specific status
    },
    include: {
      customer: true,
      lines: {
        include: { product: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });
}

/**
 * Approve order in Finance
 */
export async function approveOrderFinance(orderId: string, actorId: string, customPrices: { lineId: string, price: number }[]) {
  return await db.$transaction(async (tx) => {
    // Apply any custom prices
    for (const cp of customPrices) {
      await tx.orderLine.update({
        where: { id: cp.lineId },
        data: { unitPrice: cp.price }
      });
    }

    // Set order to CONFIRMED so it moves to Stock Assessment
    const order = await tx.order.update({
      where: { id: orderId },
      data: { commercialStatus: "CONFIRMED" }
    });

    return order;
  });
}

/**
 * Fetch all payments for a specific order
 */
export async function getOrderPayments(orderId: string) {
  return await db.payment.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Log an advance payment for an order
 */
export async function logAdvancePayment(orderId: string, actorId: string, amount: number, method: string, reference?: string) {
  return await db.$transaction(async (tx) => {
    // 1. Create the payment record
    const payment = await tx.payment.create({
      data: {
        paymentNo: `PAY-${Date.now()}`,
        orderId,
        paymentType: "ADVANCE",
        method,
        reference: reference || null,
        amount,
        status: "POSTED_CLEARED", // Auto-clear for demo purposes
        postedBy: actorId,
        postedAt: new Date(),
      }
    });

    // 2. Update order payment status
    // To make this robust, we should calculate total payments vs total payable, but for now we set it to ADVANCE_CLEARED
    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "ADVANCE_CLEARED" }
    });

    return payment;
  });
}
