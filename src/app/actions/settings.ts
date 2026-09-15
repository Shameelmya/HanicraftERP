"use server";

import db from "@/lib/db";
import { verifyPermission } from "./authorization";
import { revalidatePath } from "next/cache";

export async function getDepartments() {
  return await db.department.findMany({ 
    include: { employees: true },
    orderBy: { name: 'asc' } 
  });
}

export async function getEmployees() {
  return await db.employee.findMany({
    include: {
      department: true,
      roleAssignments: { include: { role: true } },
    },
    orderBy: { name: 'asc' }
  });
}

export async function createEmployee(data: any, adminEmail: string) {
  await verifyPermission(adminEmail, ["MD"]);
  const emp = await db.employee.create({ data });
  revalidatePath("/settings");
  return emp;
}

export async function updateEmployee(id: string, data: any, adminEmail: string) {
  await verifyPermission(adminEmail, ["MD"]);
  const emp = await db.employee.update({ where: { id }, data });
  revalidatePath("/settings");
  return emp;
}

export async function createDepartment(data: any, adminEmail: string) {
  await verifyPermission(adminEmail, ["MD"]);
  const dept = await db.department.create({ data });
  revalidatePath("/settings");
  return dept;
}

export async function updateDepartment(id: string, data: any, adminEmail: string) {
  await verifyPermission(adminEmail, ["MD"]);
  const dept = await db.department.update({ where: { id }, data });
  revalidatePath("/settings");
  return dept;
}

export async function updateMyProfile(email: string, data: any) {
  const profile = await db.employee.findFirst({ where: { workEmail: email } });
  if (!profile) throw new Error("Profile not found");
  
  const updated = await db.employee.update({
    where: { id: profile.id },
    data: {
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp,
      photoUrl: data.photoUrl,
    }
  });
  revalidatePath("/settings");
  return updated;
}
