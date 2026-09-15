"use server";

import db from "@/lib/db";

export async function getTasks(type?: string) {
  return await db.task.findMany({
    where: type ? { type } : undefined,
    include: {
      order: true,
      assignee: true
    },
    orderBy: { createdAt: 'desc' }
  });
}
