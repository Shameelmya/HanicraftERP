"use server";

import db from "@/lib/db";

// Helper to generate a unique lead code
async function generateLeadCode(): Promise<string> {
  const count = await db.lead.count();
  return `LD-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
}

export async function getLeads() {
  return await db.lead.findMany({
    where: { stage: { not: "ARCHIVED" } },
    include: {
      customer: { select: { displayName: true, customerCode: true } },
      activities: { orderBy: { createdAt: 'desc' }, take: 1 }
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createLead(data: {
  customerName: string;
  phone: string;
  source: string;
  requirementSummary: string;
  expectedValue: number;
}) {
  const company = await db.company.findFirst();
  if (!company) throw new Error("Company not configured");

  return await db.$transaction(async (tx) => {
    // 1. Create a "Prospect" Customer for the lead
    const count = await tx.customer.count();
    const customerCode = `CUS-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const customer = await tx.customer.create({
      data: {
        companyId: company.id,
        customerCode,
        displayName: data.customerName,
        contactType: "INDIVIDUAL",
        segment: "PROSPECT",
        contacts: {
          create: [{
            originalPhone: data.phone,
            normalizedPhone: data.phone.replace(/\D/g, ''),
            isPrimary: true
          }]
        }
      }
    });

    // 2. Create the Lead
    const leadCode = await generateLeadCode();
    const lead = await tx.lead.create({
      data: {
        leadCode,
        customerId: customer.id,
        source: data.source,
        requirementSummary: data.requirementSummary,
        expectedValue: data.expectedValue,
        stage: "NEW",
      }
    });

    // 3. Log the creation activity
    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "NOTE",
        description: "Lead created from frontend",
      }
    });

    return lead;
  });
}

export async function updateLeadStage(leadId: string, newStage: string, notes?: string) {
  return await db.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id: leadId },
      data: { stage: newStage }
    });

    await tx.leadActivity.create({
      data: {
        leadId,
        type: "STATUS_CHANGE",
        description: notes || `Stage moved to ${newStage}`,
      }
    });

    return lead;
  });
}
