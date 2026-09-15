"use server";

import db from "@/lib/db";

/**
 * Verify that an employee has at least one of the required roles.
 * Returns the employee record on success, throws on failure.
 * NEVER trust a client-supplied role — always derive from DB.
 */
export async function verifyPermission(email: string, allowedRoles: string[]) {
  if (!email) throw new Error("UNAUTHENTICATED");

  const employee = await db.employee.findUnique({
    where: { workEmail: email.toLowerCase().trim() },
    include: {
      roleAssignments: {
        where: { active: true },
        include: { role: true },
      },
    },
  });

  if (!employee) throw new Error("UNAUTHENTICATED: Employee not found");
  if (employee.status !== "ACTIVE") throw new Error("FORBIDDEN: Account disabled");

  const employeeRoles = employee.roleAssignments.map((rs) => rs.role.name);

  // MD has all permissions
  if (employeeRoles.includes("MD")) return employee;

  const hasRole = allowedRoles.some((r) => employeeRoles.includes(r));
  if (!hasRole) {
    throw new Error(`FORBIDDEN: Required roles: ${allowedRoles.join(", ")}`);
  }

  return employee;
}

/**
 * Get full employee profile from email — for server actions that need the actor.
 */
export async function getEmployeeProfile(email: string) {
  if (!email) throw new Error("Email required");

  const employee = await db.employee.findUnique({
    where: { workEmail: email.toLowerCase().trim() },
    include: {
      department: true,
      roleAssignments: {
        where: { active: true },
        include: { role: true },
      },
    },
  });

  if (!employee) throw new Error("Employee not found: " + email);
  return employee;
}
