"use server";

import db from "@/lib/db";
import { getEmployeeProfile } from "./auth";

export async function getMyNotifications(userEmail: string) {
  const profile = await getEmployeeProfile(userEmail);
  if (!profile) return [];

  return await db.notification.findMany({
    where: { recipientId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
}

export async function markNotificationRead(notificationId: string) {
  return await db.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() }
  });
}
