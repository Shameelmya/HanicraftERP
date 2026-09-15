"use server";

import db from "@/lib/db";
import { verifyPermission } from "./authorization";

export async function getProducts() {
  return await db.product.findMany({
    orderBy: { sku: 'asc' }
  });
}

export async function updateProductImage(productId: string, imageUrl: string, userEmail: string) {
  await verifyPermission(userEmail, ["MD", "GM", "Stock"]);
  
  return await db.product.update({
    where: { id: productId },
    data: { imageUrl }
  });
}

export async function upsertProduct(data: any, userEmail: string) {
  await verifyPermission(userEmail, ["MD", "GM", "Stock"]);
  
  return await db.product.upsert({
    where: { sku: data.sku },
    update: data,
    create: data
  });
}

export async function deleteProduct(id: string, userEmail: string) {
  await verifyPermission(userEmail, ["MD", "GM"]);
  
  // Need to ensure product has no inventory/orders attached before deleting, 
  // or Prisma will throw a foreign key error. We'll let Prisma throw it.
  return await db.product.delete({
    where: { id }
  });
}
