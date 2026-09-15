"use client";

import React, { useState } from "react";
import { Search, Plus, ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { searchCustomerByPhone } from "@/app/actions/customer";

export const CustomerSearchPanel: React.FC = () => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await searchCustomerByPhone(phone);
      if (res) {
        setResult(res);
      } else {
        setResult(null);
        setError("No customer found with this mobile number. You can create a new lead.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-section-title">Customer Search</h2>
          <p className="text-muted mt-1">Search by phone to pull customer intelligence before creating an order.</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Enter 10-digit mobile number"
                className="input pl-10 h-10 w-full text-lg font-medium"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || phone.length < 10}>
              {loading ? "Searching..." : "Search"}
            </button>
            <Link href="/customers/new" className="btn btn-secondary">
              <Plus className="w-4 h-4" /> New Customer
            </Link>
          </form>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-orange-50 text-orange-800 rounded-md border border-orange-200">
          {error}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card md:col-span-1 border-blue-200 shadow-blue-100/50 shadow-lg">
            <div className="card-header bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <User className="w-4 h-4" /> {result.displayName}
              </h3>
              <span className="badge badge-blue">{result.segment ?? "NEW"}</span>
            </div>
            <div className="card-body space-y-4">
              <div>
                <p className="text-xs text-muted font-medium uppercase">Customer Code</p>
                <p className="font-mono text-sm">{result.customerCode}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted font-medium uppercase">Contacts</p>
                {result.contacts?.map((c: any) => (
                  <div key={c.id} className="text-sm">
                    {c.isPrimary && <span className="text-blue-600 font-medium mr-1">•</span>}
                    {c.phone} {c.name ? `(${c.name})` : ""}
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs text-muted font-medium uppercase">Sales Metrics</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-muted">LTV</p>
                    <p className="font-semibold">₹{result.intelligence?.lifetimeValue?.toLocaleString("en-IN") ?? 0}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="text-xs text-muted">Orders</p>
                    <p className="font-semibold">{result.intelligence?.lifetimeOrders ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer bg-gray-50 border-t border-gray-100">
              <Link href={`/sales/new?customerId=${result.id}`} className="btn btn-primary w-full justify-center">
                Create Order <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>

          <div className="card md:col-span-2">
            <div className="card-header">
              <h3 className="text-section-title">Recent Activity</h3>
            </div>
            <div className="card-body p-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.orders ?? []).slice(0, 5).map((order: any) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/sales/${order.id}`} className="text-blue-600 hover:underline font-mono text-sm">
                          {order.orderNo}
                        </Link>
                      </td>
                      <td className="text-sm">{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                      <td>
                        <span className={`badge ${order.commercialStatus === "CONFIRMED" ? "badge-blue" : "badge-gray"}`}>
                          {order.commercialStatus}
                        </span>
                      </td>
                      <td className="text-right text-sm font-medium">₹{order.totalPayable.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                  {(!result.orders || result.orders.length === 0) && (
                    <tr>
                      <td colSpan={4} className="text-center p-4 text-muted">No past orders</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
