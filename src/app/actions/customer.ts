"use server";

import db from "@/lib/db";

// Normalize phone: strip non-digits, handle leading 0 and country code
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits;
}

function generateCustomerCode(count: number): string {
  return `CUS-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

/**
 * SALE-01: Phone-first customer lookup.
 * Searches by normalized phone. Returns the full customer intelligence panel
 * from actual DB data — never mocked.
 */
export async function searchCustomerByPhone(phone: string) {
  if (!phone || phone.trim().length < 6) return null;
  const normalized = normalizePhone(phone.trim());

  const contact = await db.customerContact.findFirst({
    where: { normalizedPhone: normalized },
    include: {
      customer: {
        include: {
          contacts: true,
          addresses: { where: { isPrimary: true } },
          taxProfiles: { where: { validUntil: null } },
          notes: { orderBy: { createdAt: "desc" }, take: 5 },
          orders: {
            include: {
              lines: { include: { product: true } },
              payments: { where: { status: "POSTED_CLEARED" } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!contact) return null;

  const customer = contact.customer;
  const orders = customer.orders;

  // Compute customer intelligence metrics from real transaction data
  let lifetimeSalesValue = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let cancelledOrders = 0;
  let totalAdvances = 0;
  const productFreq: Record<string, number> = {};

  for (const order of orders) {
    if (order.commercialStatus === "CANCELLED") {
      cancelledOrders++;
      continue;
    }

    lifetimeSalesValue += order.totalPayable;

    for (const payment of order.payments) {
      if (payment.paymentType === "ADVANCE") {
        totalAdvances += payment.amount;
        totalPaid += payment.amount;
      } else {
        totalPaid += payment.amount;
      }
    }

    totalOutstanding += Math.max(0, order.totalPayable - order.payments.reduce((s, p) => s + p.amount, 0));

    for (const line of order.lines) {
      const key = line.product?.name ?? line.description;
      productFreq[key] = (productFreq[key] ?? 0) + line.orderedQty;
    }
  }

  const lifetimeOrderCount = orders.filter((o) => o.commercialStatus !== "CANCELLED").length;
  const averageOrderValue = lifetimeOrderCount > 0 ? lifetimeSalesValue / lifetimeOrderCount : 0;
  const mostPurchased = Object.entries(productFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name]) => name);

  const lastOrder = orders[0] ?? null;
  const primaryAddress = customer.addresses[0];
  const taxProfile = customer.taxProfiles[0];

  return {
    id: customer.id,
    customerCode: customer.customerCode,
    displayName: customer.displayName,
    legalName: customer.legalName,
    contactType: customer.contactType,
    segment: customer.segment,
    creditStatus: customer.creditStatus,
    customerScore: customer.customerScore,
    isArchived: customer.isArchived,
    contacts: customer.contacts,
    primaryPhone: contact.originalPhone,
    whatsapp: contact.isWhatsApp ? contact.originalPhone : null,
    email: contact.email,
    address: primaryAddress
      ? [primaryAddress.line1, primaryAddress.locality, primaryAddress.district, primaryAddress.state]
          .filter(Boolean)
          .join(", ")
      : null,
    district: primaryAddress?.district,
    state: primaryAddress?.state,
    gstin: taxProfile?.gstin,
    isGstRegistered: taxProfile?.isGstRegistered ?? false,
    notes: customer.notes,
    intelligence: {
      lifetimeOrderCount,
      lifetimeSalesValue,
      totalPaid,
      totalOutstanding,
      totalAdvances,
      averageOrderValue,
      cancelledOrders,
      mostPurchasedProducts: mostPurchased,
      lastOrderDate: lastOrder?.createdAt ?? null,
      lastOrderStatus: lastOrder?.commercialStatus ?? null,
      lastOrderNo: lastOrder?.orderNo ?? null,
      customerSince: customer.createdAt,
    },
  };
}

// SALE-02: Also return all matches when multiple contacts share a phone
export async function searchAllCustomersForPhone(phone: string) {
  const normalized = normalizePhone(phone.trim());
  const contacts = await db.customerContact.findMany({
    where: { normalizedPhone: normalized },
    include: {
      customer: {
        include: { contacts: true, addresses: { where: { isPrimary: true } } },
      },
    },
    take: 10,
  });
  return contacts.map((c) => c.customer);
}

export async function getCustomerById(customerId: string) {
  return await db.customer.findUnique({
    where: { id: customerId },
    include: {
      contacts: true,
      addresses: true,
      taxProfiles: { where: { validUntil: null } },
      notes: { orderBy: { createdAt: "desc" } },
      leads: { orderBy: { createdAt: "desc" }, take: 5 },
      orders: {
        include: {
          lines: { include: { product: true } },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function createCustomer(data: {
  displayName: string;
  legalName?: string;
  contactType?: string;
  segment?: string;
  phone: string;
  isWhatsApp?: boolean;
  email?: string;
  addressLine1?: string;
  locality?: string;
  district?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  isGstRegistered?: boolean;
  remarks?: string;
}) {
  const normalized = normalizePhone(data.phone);

  // Check for existing contact with same phone
  const existing = await db.customerContact.findFirst({
    where: { normalizedPhone: normalized },
    include: { customer: true },
  });
  if (existing) {
    throw new Error(
      `Phone already linked to customer: ${existing.customer.displayName} (${existing.customer.customerCode})`
    );
  }

  const count = await db.customer.count();
  const customerCode = generateCustomerCode(count);

  // We need the company ID — using the single-company setup
  const company = await db.company.findFirst();
  if (!company) throw new Error("Company not configured");

  return await db.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        companyId: company.id,
        customerCode,
        displayName: data.displayName,
        legalName: data.legalName,
        contactType: data.contactType ?? "INDIVIDUAL",
        segment: data.segment,
        creditStatus: "GOOD",
      },
    });

    await tx.customerContact.create({
      data: {
        customerId: customer.id,
        originalPhone: data.phone,
        normalizedPhone: normalized,
        email: data.email,
        isWhatsApp: data.isWhatsApp ?? false,
        isPrimary: true,
      },
    });

    if (data.addressLine1 || data.district || data.state) {
      await tx.customerAddress.create({
        data: {
          customerId: customer.id,
          type: "BILLING",
          line1: data.addressLine1,
          locality: data.locality,
          district: data.district,
          state: data.state,
          pincode: data.pincode,
          isPrimary: true,
        },
      });
    }

    if (data.gstin || data.isGstRegistered) {
      await tx.customerTaxProfile.create({
        data: {
          customerId: customer.id,
          gstin: data.gstin,
          isGstRegistered: data.isGstRegistered ?? false,
        },
      });
    }

    return customer;
  });
}

export async function updateCustomer(
  customerId: string,
  data: {
    displayName?: string;
    legalName?: string;
    segment?: string;
    creditStatus?: string;
    remarks?: string;
  }
) {
  return await db.customer.update({
    where: { id: customerId },
    data,
  });
}

export async function getCustomers(search?: string, page = 1, pageSize = 25) {
  const where = search
    ? {
        OR: [
          { displayName: { contains: search } },
          { customerCode: { contains: search } },
          { contacts: { some: { originalPhone: { contains: search } } } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      include: {
        contacts: { where: { isPrimary: true } },
        addresses: { where: { isPrimary: true } },
        orders: { select: { totalPayable: true, commercialStatus: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.customer.count({ where }),
  ]);

  return { customers, total, page, pageSize, hasMore: page * pageSize < total };
}
