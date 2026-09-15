"use server";

import db from "@/lib/db";

export async function getDashboardStats(employeeId?: string, role?: string) {
  const company = await db.company.findFirst();
  if (!company) return null;

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Role-specific dashboard data
  if (role === "Sales") {
    const [myLeads, openOrders, readyOrders] = await Promise.all([
      db.lead.count({ where: { stage: { notIn: ["LOST", "ARCHIVED"] } } }),
      db.order.count({ where: { commercialStatus: "CONFIRMED", fulfilmentStatus: { not: "DISPATCHED" } } }),
      db.order.count({ where: { fulfilmentStatus: "READY" } }),
    ]);
    return { myLeads, openOrders, readyOrders };
  }

  if (role === "Finance") {
    const [pending, monthCollections, overdueCount] = await Promise.all([
      db.order.count({ where: { paymentStatus: { in: ["NO_PAYMENT", "ADVANCE_PENDING"] } } }),
      db.payment.aggregate({ where: { status: "POSTED_CLEARED", createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      db.order.count({ where: { promiseDate: { lt: today }, paymentStatus: { not: "FULLY_PAID" }, commercialStatus: { not: "CANCELLED" } } }),
    ]);
    return { pending, monthCollections: monthCollections._sum.amount ?? 0, overdueCount };
  }

  if (role === "Stock") {
    const [totalActive, belowMin, pendingReceipts, pendingFulfil] = await Promise.all([
      db.product.count({ where: { isActive: true } }),
      db.product.count({ where: { isActive: true, importFlags: { contains: "verify_opening" } } }),
      db.productionHandover.count({ where: { status: "READY" } }),
      db.order.count({ where: { fulfilmentStatus: "QUEUED_FOR_STOCK" } }),
    ]);
    return { totalActive, belowMin, pendingReceipts, pendingFulfil };
  }

  if (role === "Production_Supervisor") {
    const [pendingRequests, activeJobs, overdueJobs] = await Promise.all([
      db.productionRequest.count({ where: { status: "SUBMITTED" } }),
      db.productionJob.count({ where: { status: { in: ["IN_PROGRESS", "RELEASED"] } } }),
      db.productionJob.count({ where: { status: { in: ["IN_PROGRESS", "RELEASED"] }, plannedEnd: { lt: today } } }),
    ]);
    return { pendingRequests, activeJobs, overdueJobs };
  }

  if (role === "Operator" || role === "Finishing_Supervisor") {
    const myTasks = employeeId
      ? await db.task.findMany({
          where: {
            assigneeId: employeeId,
            status: { in: ["ASSIGNED", "RECEIVED", "IN_PROGRESS"] },
          },
          include: {
            operation: { include: { job: { include: { request: { include: { lines: { include: { product: true } } } } } } } },
          },
          orderBy: [{ dueAt: "asc" }],
          take: 10,
        })
      : [];
    return { myTasks };
  }

  // MD/GM: company-wide overview
  return await getMDStatsCached(startOfMonth);
}

import { unstable_cache } from "next/cache";

const getMDStatsCached = unstable_cache(async (startOfMonth: Date) => {
  const [
    totalOrders,
    monthRevenue,
    activeJobs,
    totalProducts,
    employeeCount,
    ordersQuery,
  ] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.payment.aggregate({ where: { status: "POSTED_CLEARED", createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.productionJob.count({ where: { status: { in: ["IN_PROGRESS", "RELEASED", "AWAITING_QC"] } } }),
    db.product.count({ where: { isActive: true } }),
    db.employee.count({ where: { status: "ACTIVE" } }),
    db.order.findMany({
      select: { id: true, orderNo: true, commercialStatus: true, fulfilmentStatus: true, paymentStatus: true, totalPayable: true, customer: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const [globalOpenOrders, globalPendingPayments] = await Promise.all([
    db.order.count({ where: { commercialStatus: "CONFIRMED", fulfilmentStatus: { not: "DISPATCHED" } } }),
    db.order.count({ where: { paymentStatus: { in: ["NO_PAYMENT", "ADVANCE_PENDING"] } } })
  ]);

  return {
    totalOrders,
    monthRevenue: monthRevenue._sum.amount ?? 0,
    openOrders: globalOpenOrders,
    pendingPayments: globalPendingPayments,
    activeJobs,
    totalProducts,
    employeeCount,
    recentOrders: ordersQuery,
  };
}, ["md-dashboard-stats"], { revalidate: 30 });

export async function getMyNotifications(employeeId: string, page = 1, pageSize = 20) {
  const [notifications, total] = await Promise.all([
    db.notification.findMany({
      where: { recipientId: employeeId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.notification.count({ where: { recipientId: employeeId } }),
  ]);

  const unreadCount = await db.notification.count({
    where: { recipientId: employeeId, readAt: null },
  });

  return { notifications, total, unreadCount, page, pageSize };
}

export async function markNotificationRead(notificationId: string) {
  return await db.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}
