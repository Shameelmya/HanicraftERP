"use server";

import db from "@/lib/db";
import { getEmployeeProfile } from "./authorization";

export async function getShopFloorEmployees() {
  return db.employee.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      roleAssignments: {
        include: { role: true }
      }
    }
  });
}

export async function assignTaskToWorker(data: {
  operationId: string;
  workerId: string;
  assignerEmail: string;
  taskType: string;
  dueAt: Date;
  instructions?: string;
  targetQty: number;
}) {
  const assigner = await getEmployeeProfile(data.assignerEmail);
  
  const operation = await db.operation.findUnique({
    where: { id: data.operationId },
    include: { job: true }
  });

  if (!operation) throw new Error("Operation not found");

  // Generate a unique task code
  const taskCount = await db.task.count();
  const taskCode = `TSK-${new Date().getFullYear()}-${String(taskCount + 1).padStart(5, '0')}`;

  return db.task.create({
    data: {
      taskCode,
      type: data.taskType,
      operationId: data.operationId,
      assignerId: assigner.id,
      assigneeId: data.workerId,
      status: "ASSIGNED",
      priority: operation.job.priority || "NORMAL",
      dueAt: data.dueAt,
      instructions: data.instructions,
      goodQty: 0,
      assignedAt: new Date()
    }
  });
}
