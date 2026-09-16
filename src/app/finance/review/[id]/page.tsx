"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/auth/AuthContext";
import { getOrderById } from "@/app/actions/sales";
import { approveOrderFinance, getOrderPayments, logAdvancePayment } from "@/app/actions/finance";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, FileText, PlusCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function FinanceReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  
  // Payment state
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: "", method: "BANK_TRANSFER", reference: "" });

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getOrderById(id as string);
      setOrder(data);
      const initPrices: Record<string, number> = {};
      data?.lines.forEach((line: any) => {
        initPrices[line.id] = line.unitPrice;
      });
      setPrices(initPrices);

      const pays = await getOrderPayments(id as string);
      setPayments(pays);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleAddPayment = async () => {
    if (!user || !order) return;
    const amt = parseFloat(newPayment.amount);
    if (!amt || amt <= 0) return alert("Enter valid amount");
    setSaving(true);
    try {
      await logAdvancePayment(order.id, user.id, amt, newPayment.method, newPayment.reference);
      setShowPaymentModal(false);
      setNewPayment({ amount: "", method: "BANK_TRANSFER", reference: "" });
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to add payment");
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    if (!order) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Hanicraft Estimation", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Order No: ${order.orderNo}`, 14, 32);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 38);
    
    // Customer Info
    doc.text("Customer Details:", 120, 32);
    doc.text(order.customer?.displayName || "", 120, 38);
    doc.text(order.customer?.email || "", 120, 44);
    
    // Table Data
    const tableData = order.lines.map((line: any) => [
      line.product.sku,
      line.product.name + (line.description ? ` - ${line.description}` : ""),
      line.orderedQty.toString(),
      prices[line.id]?.toLocaleString("en-IN") || "0",
      (line.orderedQty * (prices[line.id] || 0)).toLocaleString("en-IN")
    ]);
    
    let currentTotal = order.lines.reduce((acc: number, line: any) => acc + (line.orderedQty * (prices[line.id] || 0)), 0);

    (doc as any).autoTable({
      startY: 55,
      head: [["SKU", "Description", "Qty", "Unit Price (INR)", "Total (INR)"]],
      body: tableData,
      foot: [["", "", "", "Grand Total", currentTotal.toLocaleString("en-IN")]],
      theme: 'grid',
      headStyles: { fillColor: [66, 135, 245] }
    });
    
    doc.save(`Estimation_${order.orderNo}.pdf`);
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

  // Calculate Advance Rules
  const customItemsTotal = order.lines
    .filter((l: any) => l.itemType === 'CUSTOM')
    .reduce((sum: number, l: any) => sum + (l.orderedQty * (prices[l.id] || 0)), 0);
  
  const totalAdvancePaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
  
  // They can only approve if there are no custom items, or if the advance paid is >= custom items total
  const canApprove = customItemsTotal === 0 || totalAdvancePaid >= customItemsTotal;

  return (
    <AppLayout>
      <div className="page-content max-w-5xl mx-auto pb-20">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-page-title">Finance Review & Estimations</h1>
              <p className="text-muted text-sm mt-1">Order {order.orderNo}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generatePDF}>
              <FileText className="w-4 h-4 mr-2" />
              Download Estimation PDF
            </Button>
            <Button onClick={handleApprove} disabled={saving || !canApprove} className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve & Send to Stock
            </Button>
          </div>
        </div>

        {!canApprove && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Advance Payment Required</h3>
              <p className="text-sm text-orange-700 mt-1">
                This order contains CUSTOM items totaling <strong>₹ {customItemsTotal.toLocaleString("en-IN")}</strong>. 
                You must log an advance payment of at least this amount before you can approve the order for production.
                Currently paid: <strong>₹ {totalAdvancePaid.toLocaleString("en-IN")}</strong>.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="card col-span-2">
            <div className="card-header border-b p-4 bg-gray-50/50">
              <h2 className="font-semibold text-lg">Customer Information</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Customer</p>
                <p className="font-medium">{order.customer?.displayName}</p>
              </div>
              <div>
                <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Estimated Total Amount</p>
                <p className="font-bold text-blue-600">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(order.totalPayable)}
                </p>
              </div>
            </div>
          </div>

          <div className="card col-span-1 border-blue-200 shadow-sm">
             <div className="card-header border-b border-blue-100 p-4 bg-blue-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-lg text-blue-900">Advance Payments</h2>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowPaymentModal(true)}>
                <PlusCircle className="w-3 h-3 mr-1" /> Log Payment
              </Button>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Total Paid</p>
                  <p className="font-bold text-2xl text-green-600">₹ {totalAdvancePaid.toLocaleString("en-IN")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Required Custom Total</p>
                  <p className="font-semibold text-slate-700">₹ {customItemsTotal.toLocaleString("en-IN")}</p>
                </div>
              </div>
              
              {payments.length > 0 ? (
                <div className="space-y-2 mt-4 pt-4 border-t">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Logs</p>
                  {payments.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded">
                      <div>
                        <span className="font-medium">{p.method}</span>
                        <span className="text-xs text-slate-500 block">{new Date(p.postedAt).toLocaleDateString()}</span>
                      </div>
                      <span className="font-bold">₹ {p.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-4 pt-4 border-t text-center italic">No advance payments logged yet.</p>
              )}
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
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Product / Description</th>
                  <th className="p-3 font-medium text-right">Qty</th>
                  <th className="p-3 font-medium text-right">Current Price (₹)</th>
                  <th className="p-3 font-medium text-right">Review Price (₹)</th>
                  <th className="p-3 font-medium text-right">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.lines.map((line: any) => (
                  <tr key={line.id} className="hover:bg-slate-50/50">
                    <td className="p-3">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${line.itemType === 'CATALOGUE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {line.itemType}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{line.product.sku}</div>
                      <div className="text-xs text-slate-500">{line.product.name} {line.description && `- ${line.description}`}</div>
                    </td>
                    <td className="p-3 text-right tabular-nums">{line.orderedQty}</td>
                    <td className="p-3 text-right tabular-nums text-slate-500">
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
                    <td className="p-3 text-right font-semibold">
                      {(line.orderedQty * (prices[line.id] || 0)).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-4">Log Advance Payment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <Input 
                  type="number" 
                  value={newPayment.amount} 
                  onChange={e => setNewPayment({...newPayment, amount: e.target.value})} 
                  placeholder="Enter amount..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select 
                  className="w-full border-slate-200 rounded-md shadow-sm h-10 px-3 text-sm"
                  value={newPayment.method}
                  onChange={e => setNewPayment({...newPayment, method: e.target.value})}
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI / Online</option>
                  <option value="CARD">Credit/Debit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reference No. (Optional)</label>
                <Input 
                  value={newPayment.reference} 
                  onChange={e => setNewPayment({...newPayment, reference: e.target.value})} 
                  placeholder="Txn ID, Cheque No..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddPayment} disabled={saving}>
                {saving ? "Saving..." : "Save Payment Log"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
