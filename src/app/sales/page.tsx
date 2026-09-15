"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, Plus, Filter } from "lucide-react";

export default function SalesDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We will fetch orders here
    setLoading(false);
  }, []);

  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="text-page-title">Sales Orders</h1>
            <p className="text-muted mt-1">Manage and track customer orders</p>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-secondary">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <Link href="/sales/new" className="btn btn-primary">
              <Plus className="w-4 h-4" /> New Order
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-0">
            {loading ? (
              <div className="p-8 text-center text-muted">Loading orders...</div>
            ) : (
              <div className="empty-state p-12">
                <ShoppingCart className="empty-state-icon" />
                <h3 className="text-lg font-medium mt-4">No orders found</h3>
                <p className="text-muted mt-2 max-w-md mx-auto">
                  Get started by searching for an existing customer or creating a new lead to place an order.
                </p>
                <Link href="/customers" className="btn btn-primary mt-6">
                  Find Customer
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
