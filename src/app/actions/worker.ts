"use server";

import db from "@/lib/db";
import { getEmployeeProfile } from "./authorization";

export async function getWorkerTasks(email: string) {
  const profile = await getEmployeeProfile(email);
  if (!profile) throw new Error("Worker not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  // Fetch tasks assigned to this worker
  const tasks = await db.task.findMany({
    where: {
      assigneeId: profile.id,
      dueAt: {
        gte: today,
        lt: dayAfter
      },
      status: {
        in: ["ASSIGNED", "IN_PROGRESS", "RECEIVED"]
      }
    },
    include: {
      order: true,
      operation: {
        include: {
          job: true
        }
      }
    },
    orderBy: {
      dueAt: 'asc'
    }
  });

  return tasks;
}

export async function startWorkerTask(taskId: string, email: string) {
  const profile = await getEmployeeProfile(email);
  if (!profile) throw new Error("Worker not found");

  return db.task.update({
    where: { id: taskId, assigneeId: profile.id },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date()
    }
  });
}

export async function completeWorkerTask(taskId: string, email: string, completedQty: number) {
  const profile = await getEmployeeProfile(email);
  if (!profile) throw new Error("Worker not found");

  const task = await db.task.findUnique({ where: { id: taskId, assigneeId: profile.id } });
  if (!task) throw new Error("Task not found or not assigned to you");

  // Update Task
  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: "SUBMITTED",
      goodQty: completedQty
    }
  });

  // If this task belongs to an operation, we can optionally update operation's outputQty.
  if (task.operationId) {
    await db.operation.update({
      where: { id: task.operationId },
      data: {
        outputQty: { increment: completedQty },
        status: "IN_PROGRESS"
      }
    });
  }

  return updatedTask;
}
