"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { CustomerSearchPanel } from "./CustomerTable";

export default function CustomersPage() {
  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header">
          <h1 className="text-page-title">Customers</h1>
          <p className="text-muted mt-1">Search customers and view customer intelligence</p>
        </div>
        
        <CustomerSearchPanel />
      </div>
    </AppLayout>
  );
}
