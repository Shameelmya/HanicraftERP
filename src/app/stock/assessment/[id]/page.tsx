"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/auth/AuthContext";
import { getOrderById } from "@/app/actions/sales";
import { markOrderReady } from "@/app/actions/stock";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Box, CheckCircle, PackageSearch, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function StockAssessmentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;
    getOrderById(id as string)
      .then((data) => {
        setOrder(data);
        const initAlloc: Record<string, number> = {};
        data?.lines.forEach((line: any) => {
          initAlloc[line.id] = line.allocatedQty || 0;
        });
        setAllocations(initAlloc);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    if (!user || !order) return;
    setSaving(true);
    try {
      const fullyAllocated = await markOrderReady(order.id, user.id);
      if (fullyAllocated) {
        alert("Order fully allocated and marked ready for dispatch!");
      } else {
        alert("Order partially allocated. Waiting for production.");
      }
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Failed to process stock assessment");
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
      <div className="page-content max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-page-title">Stock Assessment</h1>
              <p className="text-muted text-sm mt-1">Order {order.orderNo} · {order.customer?.displayName}</p>
            </div>
          </div>
          <Button onClick={handleApprove} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Assessment
          </Button>
        </div>

        <div className="card">
          <div className="card-header border-b p-4 bg-gray-50/50 flex justify-between items-center">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-blue-600" />
              Order Items & Inventory
            </h2>
          </div>
          <div className="p-0">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-500">
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium text-right">Required Qty</th>
                  <th className="p-4 font-medium text-right">Available in Stock</th>
                  <th className="p-4 font-medium text-right">Allocated</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.lines.map((line: any) => {
                  const availableStock = line.product.inventoryBalances?.reduce((sum: number, b: any) => sum + (b.physicalQty - b.reservedQty - b.holdQty), 0) || 0;
                  const req = line.orderedQty - line.cancelledQty;
                  const isMissing = availableStock < req;

                  return (
                    <tr key={line.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          <Box className="w-4 h-4 text-slate-400" />
                          {line.product.sku}
                        </div>
                        <div className="text-xs text-slate-500 ml-6">{line.product.name}</div>
                      </td>
                      <td className="p-4 text-right tabular-nums font-semibold">{req}</td>
                      <td className="p-4 text-right tabular-nums text-blue-600 font-medium">
                        {availableStock}
                      </td>
                      <td className="p-4 text-right w-32">
                        <Input 
                          type="number"
                          className="text-right h-8"
                          value={allocations[line.id] || 0}
                          onChange={(e) => setAllocations({ ...allocations, [line.id]: parseInt(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="p-4">
                        {isMissing ? (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded w-fit">
                            <AlertCircle className="w-3 h-3" /> Insufficient Stock
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded w-fit">
                            <CheckCircle className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {isMissing && (
                          <Link href={`/production?request=${line.product.id}&qty=${req - availableStock}`} className="btn btn-secondary btn-sm">
                            Request Production
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
