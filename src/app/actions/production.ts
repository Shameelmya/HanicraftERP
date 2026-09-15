"use server";

import db from "@/lib/db";

function generateJobNo(count: number): string {
  return `JOB-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

function generateTaskCode(count: number): string {
  return `TSK-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Production Manager accepts a production request and creates a job with route
 */
export async function acceptProductionRequest(data: {
  requestId: string;
  notes?: string;
  acrylicRequired?: boolean;
  stages: Array<{
    stage: string; // CUTTING_CNC, CUTTING_LASER, FINISHING_PUTTY, etc.
    sequenceOrder: number;
    inputQty: number;
    instructions?: string;
    drawingRef?: string;
    workCentreId?: string;
  }>;
  acceptedById?: string;
}) {
  const company = await db.company.findFirst();
  if (!company) throw new Error("Company not configured");

  const request = await db.productionRequest.findUnique({
    where: { id: data.requestId },
    include: { lines: true, order: true },
  });
  if (!request) throw new Error("Production request not found");
  if (request.status !== "SUBMITTED" && request.status !== "RECEIVED") {
    throw new Error("Request is not in a state to be accepted");
  }

  const totalQty = request.lines.reduce((s, l) => s + l.requestedQty, 0);
  const jobCount = await db.productionJob.count();

  return await db.$transaction(async (tx) => {
    // Accept the request
    await tx.productionRequest.update({
      where: { id: data.requestId },
      data: { status: "ACCEPTED" },
    });

    // Create production job
    const job = await tx.productionJob.create({
      data: {
        companyId: company.id,
        jobNo: generateJobNo(jobCount),
        requestId: data.requestId,
        status: "RELEASED",
        targetQty: totalQty,
        priority: request.priority,
        acrylicRequired: data.acrylicRequired ?? false,
        notes: data.notes,
        operations: {
          create: data.stages.map((s) => ({
            stage: s.stage,
            sequenceOrder: s.sequenceOrder,
            inputQty: s.inputQty,
            instructions: s.instructions,
            drawingRef: s.drawingRef,
            workCentreId: s.workCentreId,
            status: "PENDING",
          })),
        },
      },
      include: { operations: true },
    });

    // Update job on production request
    await tx.productionJob.update({
      where: { id: job.id },
      data: { status: "IN_PROGRESS" },
    });

    // Audit
    await tx.auditEvent.create({
      data: {
        companyId: company.id,
        actorId: data.acceptedById,
        entityType: "ProductionRequest",
        entityId: data.requestId,
        action: "ACCEPTED",
        newValues: JSON.stringify({ jobNo: job.jobNo, stages: data.stages.length }),
      },
    });

    return job;
  });
}

/**
 * Assign a production operation to an employee (creates a task card)
 */
export async function assignOperation(data: {
  operationId: string;
  assigneeId: string;
  assignedById?: string;
  dueAt?: string;
}) {
  const company = await db.company.findFirst();
  if (!company) throw new Error("Company not configured");

  const operation = await db.operation.findUnique({
    where: { id: data.operationId },
    include: { job: { include: { request: { include: { order: { include: { customer: true } } } } } } },
  });
  if (!operation) throw new Error("Operation not found");

  const taskCount = await db.task.count();
  const taskType = operation.stage.includes("FINISH") ? "FINISHING" : operation.stage.includes("ACRYLIC") ? "ACRYLIC" : operation.stage.includes("QC") ? "QC" : "CUTTING";

  return await db.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        taskCode: generateTaskCode(taskCount),
        type: taskType,
        operationId: data.operationId,
        assignerId: data.assignedById,
        assigneeId: data.assigneeId,
        status: "ASSIGNED",
        instructions: operation.instructions ?? `${operation.stage} — ${operation.inputQty} units. Drawing: ${operation.drawingRef ?? "N/A"}`,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        sourceDept: "Production",
        destDept: taskType,
      },
    });

    await tx.operation.update({
      where: { id: data.operationId },
      data: { status: "ASSIGNED" },
    });

    // Notify the assignee
    await tx.notification.create({
      data: {
        companyId: company.id,
        recipientId: data.assigneeId,
        eventType: "TASK_ASSIGNED",
        title: `New Task: ${operation.stage}`,
        message: `You have been assigned ${operation.stage} work. Qty: ${operation.inputQty}. Please Receive or Reject.`,
        targetRef: task.id,
        targetRefType: "Task",
      },
    });

    return task;
  });
}

/**
 * Receive a task (worker acknowledges it)
 */
export async function receiveTask(taskId: string, receivedById: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (task.assigneeId !== receivedById) throw new Error("This task is not assigned to you");
  if (task.status !== "ASSIGNED") throw new Error("Task cannot be received in current state");

  const updated = await db.task.update({
    where: { id: taskId },
    data: { status: "RECEIVED", receivedAt: new Date() },
  });

  await db.taskEvent.create({
    data: { taskId, eventType: "RECEIVED", actorId: receivedById },
  });

  return updated;
}

/**
 * Reject a task (sends back to queue)
 */
export async function rejectTask(taskId: string, rejectedById: string, reason: string) {
  if (!reason?.trim()) throw new Error("Rejection reason is required");

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (task.status !== "ASSIGNED" && task.status !== "RECEIVED") {
    throw new Error("Task cannot be rejected in current state");
  }

  const updated = await db.task.update({
    where: { id: taskId },
    data: { status: "REJECTED", rejectionReason: reason, rejectedAt: new Date() },
  });

  await db.taskEvent.create({
    data: { taskId, eventType: "REJECTED", actorId: rejectedById, reason },
  });

  return updated;
}

/**
 * Start working on a task
 */
export async function startTask(taskId: string, workerId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (task.status !== "RECEIVED") throw new Error("Must receive task before starting");

  const updated = await db.task.update({
    where: { id: taskId },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });

  await db.taskEvent.create({
    data: { taskId, eventType: "STARTED", actorId: workerId },
  });

  if (task.operationId) {
    await db.operation.update({
      where: { id: task.operationId },
      data: { status: "IN_PROGRESS" },
    });
  }

  return updated;
}

/**
 * Submit completed task with output quantities
 */
export async function submitTask(data: {
  taskId: string;
  workerId: string;
  goodQty: number;
  reworkQty?: number;
  scrapQty?: number;
  notes?: string;
}) {
  const company = await db.company.findFirst();
  if (!company) throw new Error("Company not configured");

  const task = await db.task.findUnique({
    where: { id: data.taskId },
    include: {
      operation: { include: { job: true } },
    },
  });
  if (!task) throw new Error("Task not found");
  if (task.status !== "IN_PROGRESS") throw new Error("Task must be started before submitting");

  const submitted = await db.task.update({
    where: { id: data.taskId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      goodQty: data.goodQty,
      reworkQty: data.reworkQty ?? 0,
      scrapQty: data.scrapQty ?? 0,
    },
  });

  await db.taskEvent.create({
    data: {
      taskId: data.taskId,
      eventType: "SUBMITTED",
      actorId: data.workerId,
      goodQty: data.goodQty,
      notes: data.notes,
    },
  });

  if (task.operationId) {
    await db.operation.update({
      where: { id: task.operationId },
      data: {
        status: "SUBMITTED",
        outputQty: data.goodQty,
        scrapQty: data.scrapQty ?? 0,
        reworkQty: data.reworkQty ?? 0,
      },
    });
  }

  // Notify supervisor to verify
  const supervisor = await db.employee.findFirst({
    where: {
      roleAssignments: {
        some: {
          role: { name: { in: ["Production_Supervisor", "Finishing_Supervisor"] } },
          active: true,
        },
      },
      status: "ACTIVE",
    },
  });

  if (supervisor) {
    await db.notification.create({
      data: {
        companyId: company.id,
        recipientId: supervisor.id,
        eventType: "TASK_SUBMITTED",
        title: `Task Submitted for Verification`,
        message: `Task ${task.taskCode} submitted. Good: ${data.goodQty}, Rework: ${data.reworkQty ?? 0}, Scrap: ${data.scrapQty ?? 0}. Please verify.`,
        targetRef: data.taskId,
        targetRefType: "Task",
      },
    });
  }

  return submitted;
}

/**
 * Verify a submitted task (supervisor action)
 */
export async function verifyTask(taskId: string, verifiedById: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { operation: { include: { job: { include: { operations: true } } } } },
  });
  if (!task) throw new Error("Task not found");
  if (task.status !== "SUBMITTED") throw new Error("Task must be submitted before verifying");

  const verified = await db.task.update({
    where: { id: taskId },
    data: { status: "VERIFIED", verifiedAt: new Date() },
  });

  await db.taskEvent.create({
    data: { taskId, eventType: "VERIFIED", actorId: verifiedById },
  });

  if (task.operationId) {
    await db.operation.update({
      where: { id: task.operationId },
      data: { status: "VERIFIED" },
    });

    // Check if all operations in job are verified to offer handover
    if (task.operation?.job) {
      const allOps = task.operation.job.operations;
      const allVerified = allOps.every((op) => op.status === "VERIFIED");
      if (allVerified) {
        await db.productionJob.update({
          where: { id: task.operation.job.id },
          data: { status: "AWAITING_QC" },
        });
      }
    }
  }

  return verified;
}

/**
 * Production request list for Production Manager
 */
export async function getProductionRequests(filter?: { status?: string }) {
  return await db.productionRequest.findMany({
    where: filter?.status ? { status: filter.status } : {},
    include: {
      lines: { include: { product: true } },
      order: { include: { customer: true } },
      jobs: true,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 50,
  });
}

/**
 * Production jobs board
 */
export async function getProductionJobs(filter?: { status?: string }) {
  return await db.productionJob.findMany({
    where: filter?.status ? { status: filter.status } : { status: { not: "CLOSED" } },
    include: {
      request: {
        include: {
          lines: { include: { product: true } },
          order: { include: { customer: true } },
        },
      },
      operations: { include: { tasks: { include: { assignee: true } } } },
      inspections: true,
      handovers: true,
    },
    orderBy: [{ priority: "desc" }, { plannedEnd: "asc" }, { createdAt: "asc" }],
    take: 50,
  });
}

/**
 * My tasks — for any operator/worker
 */
export async function getMyTasks(employeeId: string) {
  return await db.task.findMany({
    where: {
      assigneeId: employeeId,
      status: { in: ["ASSIGNED", "RECEIVED", "IN_PROGRESS", "SUBMITTED", "PAUSED"] },
    },
    include: {
      operation: {
        include: {
          job: {
            include: {
              request: {
                include: {
                  lines: { include: { product: true } },
                  order: { include: { customer: true } },
                },
              },
            },
          },
        },
      },
      order: { include: { customer: true } },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    take: 20,
  });
}
