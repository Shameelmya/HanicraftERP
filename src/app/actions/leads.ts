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
  lines: Array<{
    itemType: "CATALOGUE" | "CUSTOM" | "SERVICE";
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
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

    // Compute totals
    let expectedValue = 0;
    const computedLines = data.lines.map((line, idx) => {
      const lineTotal = line.quantity * line.unitPrice;
      expectedValue += lineTotal;
      return {
        lineNumber: idx + 1,
        itemType: line.itemType,
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxableAmount: lineTotal,
        taxAmount: 0,
        lineTotal,
        notes: line.notes,
      };
    });

    // 2. Create the Lead
    const leadCode = await generateLeadCode();
    const lead = await tx.lead.create({
      data: {
        leadCode,
        customerId: customer.id,
        source: data.source,
        requirementSummary: data.requirementSummary,
        expectedValue,
        stage: "NEW",
      }
    });

    // 3. Create Quotation and Revision and Lines if lines exist
    if (computedLines.length > 0) {
      const qCount = await tx.quotation.count();
      const quotationNo = `QT-${new Date().getFullYear()}-${String(qCount + 1).padStart(5, "0")}`;
      
      await tx.quotation.create({
        data: {
          leadId: lead.id,
          quotationNo,
          status: "DRAFT",
          revisions: {
            create: {
              revisionNumber: 1,
              subtotal: expectedValue,
              totalAmount: expectedValue,
              lines: {
                create: computedLines
              }
            }
          }
        }
      });
    }

    // 4. Log the creation activity
    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "NOTE",
        description: "Lead created from frontend with line items",
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

export async function convertLeadToOrder(leadId: string, ownerEmployeeId?: string) {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      quotations: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { revisions: { take: 1, orderBy: { revisionNumber: "desc" }, include: { lines: true } } }
      }
    }
  });

  if (!lead) throw new Error("Lead not found");
  
  const activeQuote = lead.quotations[0];
  if (!activeQuote) throw new Error("Lead has no quotation lines");

  const activeRevision = activeQuote.revisions[0];
  if (!activeRevision || activeRevision.lines.length === 0) throw new Error("Lead quotation is empty");

  // Validate custom prices
  const unpricedCustom = activeRevision.lines.find(l => l.itemType === "CUSTOM" && (!l.unitPrice || l.unitPrice <= 0));
  if (unpricedCustom) {
    throw new Error(`Custom item '${unpricedCustom.description}' has no price finalized. Please edit and finalize custom prices before confirming the order.`);
  }

  // Reuse logic from actions/sales.ts or directly create order
  const { confirmOrder } = await import('@/app/actions/sales');
  
  const order = await confirmOrder({
    customerId: lead.customerId,
    leadId: lead.id,
    lines: activeRevision.lines.map(l => ({
      itemType: l.itemType as any,
      productId: l.productId || undefined,
      description: l.description,
      hsnSac: l.hsnSac || undefined,
      quantity: l.quantity,
      uom: l.uom,
      unitPrice: l.unitPrice,
      discountPercent: l.discountPercent,
      taxSgstPercent: l.taxSgstPercent,
      taxCgstPercent: l.taxCgstPercent,
      taxIgstPercent: l.taxIgstPercent,
    })),
    ownerEmployeeId
  });

  // Mark lead as won
  await updateLeadStage(lead.id, "WON", `Converted to Order ${order.order.orderNo}`);
  return order;
}
