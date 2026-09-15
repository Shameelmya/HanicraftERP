import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// Development auth: verifies email against the employee table.
// In production, replace with Firebase ID token verification.
// NEVER trust a client-supplied role — always derive from DB.

const DEV_PASSWORD = "password123";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // In dev mode: accept the shared dev password
    if (password !== DEV_PASSWORD) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Look up employee in DB
    const employee = await prisma.employee.findUnique({
      where: { workEmail: email.toLowerCase().trim() },
      include: {
        department: true,
        roleAssignments: {
          where: { active: true },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Account not found" }, { status: 401 });
    }

    if (employee.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account is disabled" }, { status: 403 });
    }

    // Derive role names and permissions
    const roles = employee.roleAssignments.map((rs) => rs.role.name);
    const permissions = employee.roleAssignments.flatMap((rs) =>
      rs.role.permissions.map((rp) => rp.permission.code)
    );

    const profile = {
      id: employee.id,
      employeeCode: employee.employeeCode,
      email: employee.workEmail,
      name: employee.name,
      role: roles[0] ?? "Operator",
      roles,
      department: employee.department?.name ?? null,
      departmentId: employee.departmentId ?? null,
      jobTitle: employee.jobTitle ?? null,
      photoUrl: employee.photoUrl ?? null,
      permissions,
    };

    return NextResponse.json(profile);
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
