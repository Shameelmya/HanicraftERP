"use server";

import db from "@/lib/db";

/**
 * Get the daily board for finishing department
 * Shows 4 work centres, assigned workers, and their tasks
 */
export async function getFinishingDailyBoard(date?: string) {
  const boardDate = date ? new Date(date) : new Date();
  const dayStart = new Date(boardDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(boardDate);
  dayEnd.setHours(23, 59, 59, 999);

  // Get all finishing employees
  const finishingEmployees = await db.employee.findMany({
    where: {
      department: { name: "Finishing" },
      status: "ACTIVE",
    },
    include: {
      dailyAssignments: {
        where: {
          assignDate: { gte: dayStart, lte: dayEnd },
        },
        include: { workCentre: true },
      },
      tasksReceived: {
        where: {
          type: "FINISHING",
          status: { in: ["ASSIGNED", "RECEIVED", "IN_PROGRESS", "SUBMITTED"] },
        },
        include: {
          operation: {
            include: {
              job: {
                include: {
                  request: { include: { lines: { include: { product: true } } } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { employeeCode: "asc" },
  });

  // Get all finishing work centres
  const workCentres = await db.workCentre.findMany({
    where: {
      type: { in: ["PUTTY_PAPERING", "SEALER_PAPERING", "GRAINS", "SPRAY_PAINT"] },
      active: true,
    },
    include: {
      dailyAssignments: {
        where: {
          assignDate: { gte: dayStart, lte: dayEnd },
        },
        include: { employee: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Unassigned workers for today
  const assignedEmployeeIds = new Set(
    finishingEmployees
      .filter((e) => e.dailyAssignments.length > 0)
      .map((e) => e.id)
  );
  const unassignedWorkers = finishingEmployees.filter(
    (e) => !assignedEmployeeIds.has(e.id)
  );

  return {
    date: boardDate,
    workCentres,
    finishingEmployees,
    unassignedWorkers,
  };
}

/**
 * Assign a worker to a work centre for the day
 */
export async function assignWorkerToWorkCentre(data: {
  employeeId: string;
  workCentreId: string;
  date: string;
  supervisorId?: string;
}) {
  const assignDate = new Date(data.date);
  assignDate.setHours(0, 0, 0, 0);

  // Validate employee is a finishing worker
  const employee = await db.employee.findUnique({
    where: { id: data.employeeId },
    include: { department: true },
  });
  if (!employee || employee.department?.name !== "Finishing") {
    throw new Error("Employee is not in the Finishing department");
  }

  return await db.dailyAssignment.upsert({
    where: {
      employeeId_workCentreId_assignDate: {
        employeeId: data.employeeId,
        workCentreId: data.workCentreId,
        assignDate,
      },
    },
    update: { supervisorId: data.supervisorId, updatedAt: new Date() },
    create: {
      employeeId: data.employeeId,
      workCentreId: data.workCentreId,
      assignDate,
      supervisorId: data.supervisorId,
    },
  });
}

/**
 * Remove a worker from a work centre for the day
 */
export async function removeWorkerAssignment(employeeId: string, workCentreId: string, date: string) {
  const assignDate = new Date(date);
  assignDate.setHours(0, 0, 0, 0);

  await db.dailyAssignment.delete({
    where: {
      employeeId_workCentreId_assignDate: {
        employeeId,
        workCentreId,
        assignDate,
      },
    },
  });
}

/**
 * Get finishing tasks queue (unassigned finishing operations)
 */
export async function getFinishingQueue() {
  return await db.operation.findMany({
    where: {
      stage: { in: ["FINISHING_PUTTY", "FINISHING_SEALER", "FINISHING_GRAINS", "FINISHING_SPRAY"] },
      status: { in: ["PENDING", "ASSIGNED"] },
    },
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
      tasks: { include: { assignee: true } },
    },
    orderBy: [{ job: { priority: "desc" } }, { sequenceOrder: "asc" }],
    take: 30,
  });
}
