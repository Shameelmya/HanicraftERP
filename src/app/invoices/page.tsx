"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { FileText, Search } from "lucide-react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  
  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header">
          <h1 className="text-page-title">Invoices</h1>
          <p className="text-muted mt-1">Manage billing and proforma invoices</p>
        </div>

        <div className="card">
          <div className="card-header flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search invoices..." className="input pl-10" />
            </div>
          </div>
          <div className="card-body p-0">
            <div className="empty-state p-12">
              <FileText className="empty-state-icon" />
              <h3 className="text-lg font-medium mt-4">No Invoices</h3>
              <p className="text-muted mt-2">Invoices will appear here once generated from orders.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}