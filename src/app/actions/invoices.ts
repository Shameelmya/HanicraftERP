"use server";

import db from "@/lib/db";

export async function getInvoices() {
  const invoices = await db.order.findMany({
    include: {
      customer: true,
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return invoices;
}
