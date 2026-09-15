"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/auth/AuthContext";
import { getOrderById } from "@/app/actions/sales";
import { approveOrderFinance } from "@/app/actions/finance";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Save } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function FinanceReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;
    getOrderById(id as string)
      .then((data) => {
        setOrder(data);
        const initPrices: Record<string, number> = {};
        data?.lines.forEach((line: any) => {
          initPrices[line.id] = line.unitPrice;
        });
        setPrices(initPrices);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!user || !order) return;
    setSaving(true);
    try {
      const priceUpdates = Object.keys(prices).map(lineId => ({
        lineId,
        price: prices[lineId]
      }));
      await approveOrderFinance(order.id, user.id, priceUpdates);
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Failed to approve order");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">Loading order details...</div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="p-8">Order not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-content max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-page-title">Finance Review</h1>
              <p className="text-muted text-sm mt-1">Review custom pricing for Order {order.orderNo}</p>
            </div>
          </div>
          <Button onClick={handleApprove} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve & Send to Stock
          </Button>
        </div>

        <div className="card mb-6">
          <div className="card-header border-b p-4 bg-gray-50/50">
            <h2 className="font-semibold text-lg">Customer Information</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Customer</p>
              <p className="font-medium">{order.customer?.displayName}</p>
            </div>
            <div>
              <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Total Amount</p>
              <p className="font-bold text-blue-600">
                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(order.totalPayable)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header border-b p-4 bg-gray-50/50">
            <h2 className="font-semibold text-lg">Order Items Pricing</h2>
          </div>
          <div className="p-0">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-500">
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium">Description</th>
                  <th className="p-3 font-medium text-right">Qty</th>
                  <th className="p-3 font-medium text-right">Current Price (₹)</th>
                  <th className="p-3 font-medium text-right">Review Price (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.lines.map((line: any) => (
                  <tr key={line.id} className="hover:bg-slate-50/50">
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{line.product.sku}</div>
                      <div className="text-xs text-slate-500">{line.product.name}</div>
                    </td>
                    <td className="p-3 text-slate-600">{line.description || "-"}</td>
                    <td className="p-3 text-right tabular-nums">{line.orderedQty}</td>
                    <td className="p-3 text-right tabular-nums">
                      {line.unitPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-right w-40">
                      <Input 
                        type="number"
                        className="text-right h-8"
                        value={prices[line.id] || 0}
                        onChange={(e) => setPrices({ ...prices, [line.id]: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
