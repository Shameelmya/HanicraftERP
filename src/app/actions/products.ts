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
  
  const { latestPrice, ...productData } = data;
  
  return await db.$transaction(async (tx) => {
    const product = await tx.product.upsert({
      where: { sku: productData.sku },
      update: productData,
      create: productData
    });
    
    if (latestPrice !== undefined) {
      // Check current price
      const currentPrice = await tx.priceListItem.findFirst({
        where: { productId: product.id, effectiveUntil: null },
        orderBy: { effectiveFrom: "desc" }
      });
      
      if (!currentPrice || currentPrice.price !== latestPrice) {
        if (currentPrice) {
          await tx.priceListItem.update({
            where: { id: currentPrice.id },
            data: { effectiveUntil: new Date() }
          });
        }
        await tx.priceListItem.create({
          data: {
            productId: product.id,
            price: latestPrice,
            approvedBy: userEmail
          }
        });
      }
    }
    return product;
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
