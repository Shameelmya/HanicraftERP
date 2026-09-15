"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { StockTable } from "./StockTable";
import { useState, useEffect } from "react";
import { getInventoryGrid } from "@/app/actions/stock";

export default function StockDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInventoryGrid().then((res) => {
      setData(res.products);
      setLoading(false);
    });
  }, []);

  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header">
          <h1 className="text-page-title">Stock & Inventory</h1>
          <p className="text-muted mt-1">Manage physical inventory, reservations, and fulfilment</p>
        </div>

        {loading ? (
          <div className="card p-8 text-center text-muted">Loading inventory...</div>
        ) : (
          <StockTable initialData={data} />
        )}
      </div>
    </AppLayout>
  );
}
