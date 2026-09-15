"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { getLeads, createLead, updateLeadStage, convertLeadToOrder } from "@/app/actions/leads";
import { getProducts } from "@/app/actions/products";
import { Search, Plus, Filter, Phone, User, MessageCircle, MoreVertical, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LeadLine = {
  itemType: "CATALOGUE" | "CUSTOM" | "SERVICE";
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newLead, setNewLead] = useState({ 
    customerName: "", 
    phone: "", 
    source: "PHONE", 
    requirementSummary: "", 
    lines: [] as LeadLine[]
  });

  const fetchData = async () => {
    setLoading(true);
    const [leadsData, productsData] = await Promise.all([
      getLeads(),
      getProducts()
    ]);
    setLeads(leadsData);
    setProducts(productsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!newLead.customerName || !newLead.phone) return;
    setLoading(true);
    try {
      await createLead({
        customerName: newLead.customerName,
        phone: newLead.phone,
        source: newLead.source,
        requirementSummary: newLead.requirementSummary,
        lines: newLead.lines
      });
      setIsAdding(false);
      setNewLead({ customerName: "", phone: "", source: "PHONE", requirementSummary: "", lines: [] });
      await fetchData();
    } catch (e: any) {
      alert("Error adding lead: " + e.message);
      setLoading(false);
    }
  };

  const handleStageChange = async (leadId: string, stage: string) => {
    await updateLeadStage(leadId, stage);
    await fetchData();
  };

  const handleConfirmOrder = async (leadId: string) => {
    try {
      await convertLeadToOrder(leadId);
      alert("Successfully confirmed order!");
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const addLine = (type: "CATALOGUE" | "CUSTOM") => {
    setNewLead(prev => ({
      ...prev,
      lines: [...prev.lines, { itemType: type, description: "", quantity: 1, unitPrice: 0, notes: "" }]
    }));
  };

  const updateLine = (idx: number, field: keyof LeadLine, value: any) => {
    setNewLead(prev => {
      const lines = [...prev.lines];
      if (field === "productId" && value) {
        const prod = products.find(p => p.id === value);
        if (prod) {
          lines[idx].productId = prod.id;
          lines[idx].description = prod.name;
          lines[idx].unitPrice = prod.basePrice;
        }
      } else {
        lines[idx] = { ...lines[idx], [field]: value };
      }
      return { ...prev, lines };
    });
  };

  const removeLine = (idx: number) => {
    setNewLead(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx)
    }));
  };

  const expectedValue = newLead.lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
  const stages = ["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "WON", "LOST"];

  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header flex items-start justify-between">
          <div>
            <h1 className="text-page-title">Sales Leads</h1>
            <p className="text-muted mt-1">Track and manage prospective customers</p>
          </div>
          <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> New Lead
          </Button>
        </div>

        {/* Add Lead Modal Overlay */}
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-auto p-6 max-h-[90vh] flex flex-col">
              <h2 className="text-xl font-bold mb-4 shrink-0">Add New Lead</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name *</label>
                  <Input value={newLead.customerName} onChange={e => setNewLead({...newLead, customerName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number *</label>
                  <Input value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Source</label>
                  <select 
                    className="w-full border-gray-300 rounded-md shadow-sm h-10 px-3"
                    value={newLead.source} 
                    onChange={e => setNewLead({...newLead, source: e.target.value})}
                  >
                    <option value="Phone">Phone</option>
                    <option value="Email">Email</option>
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-6 shrink-0">
                <label className="block text-sm font-medium mb-1">Requirement Summary</label>
                <Input value={newLead.requirementSummary} onChange={e => setNewLead({...newLead, requirementSummary: e.target.value})} />
              </div>

              <div className="mb-4 flex-1 overflow-auto border rounded-lg shadow-inner bg-white">
                <div className="flex justify-between items-center p-3 border-b bg-slate-50 sticky top-0 z-10">
                  <h3 className="font-semibold text-sm">Requirements & Products</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addLine("CATALOGUE")}>+ Stock Item</Button>
                    <Button variant="outline" size="sm" onClick={() => addLine("CUSTOM")}>+ Custom Item</Button>
                  </div>
                </div>
                
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b sticky top-12 z-10">
                    <tr>
                      <th className="px-4 py-2 font-medium text-slate-500 w-32">Type</th>
                      <th className="px-4 py-2 font-medium text-slate-500">Item / Description</th>
                      <th className="px-4 py-2 font-medium text-slate-500 w-48">Notes</th>
                      <th className="px-4 py-2 font-medium text-slate-500 w-24">Qty</th>
                      <th className="px-4 py-2 font-medium text-slate-500 w-32">Price (₹)</th>
                      <th className="px-4 py-2 font-medium text-slate-500 w-32">Total</th>
                      <th className="px-4 py-2 font-medium text-slate-500 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {newLead.lines.map((line, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${line.itemType === 'CATALOGUE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {line.itemType}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {line.itemType === "CATALOGUE" ? (
                            <select 
                              className="w-full text-sm border-gray-300 rounded p-1"
                              value={line.productId || ""}
                              onChange={e => updateLine(idx, "productId", e.target.value)}
                            >
                              <option value="">Select product...</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          ) : (
                            <Input 
                              className="h-8 text-sm" 
                              placeholder="Describe custom item..." 
                              value={line.description} 
                              onChange={e => updateLine(idx, "description", e.target.value)} 
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <Input className="h-8 text-sm" placeholder="Notes..." value={line.notes || ""} onChange={e => updateLine(idx, "notes", e.target.value)} />
                        </td>
                        <td className="px-4 py-2">
                          <Input type="number" min="1" className="h-8 text-sm" value={line.quantity} onChange={e => updateLine(idx, "quantity", Number(e.target.value))} />
                        </td>
                        <td className="px-4 py-2">
                          <Input 
                            type="number" 
                            className="h-8 text-sm" 
                            value={line.unitPrice} 
                            disabled={line.itemType === "CATALOGUE"} // Stock prices are read-only for Sales
                            onChange={e => updateLine(idx, "unitPrice", Number(e.target.value))} 
                          />
                        </td>
                        <td className="px-4 py-2 font-semibold">
                          ₹ {(line.quantity * line.unitPrice).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => removeLine(idx)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {newLead.lines.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500 bg-slate-50/50">
                          No items added yet. Click above to add products or custom requirements.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t font-bold sticky bottom-0 z-10">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-right">Expected Total Value:</td>
                      <td colSpan={2} className="px-4 py-3 text-blue-700">₹ {expectedValue.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t shrink-0">
                <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button onClick={handleAdd}>Save Lead</Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-6 gap-3 h-[calc(100vh-140px)] overflow-hidden">
          {stages.map(stage => (
            <div key={stage} className="bg-slate-50/50 rounded-lg border flex flex-col h-full min-w-[150px] overflow-hidden">
              <div className="flex flex-col items-center justify-center p-3 mb-2 sticky top-0 z-10 bg-white border-b shadow-sm">
                <h3 className="font-black text-indigo-700 uppercase tracking-widest text-xs mb-1">{stage}</h3>
                <span className="text-indigo-600 font-black text-3xl leading-none">
                  {leads.filter(l => l.stage === stage).length}
                </span>
              </div>
              
              <div className="space-y-3 p-2 overflow-y-auto flex-1">
                {leads.filter(l => l.stage === stage).map(lead => (
                  <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{lead.leadCode}</span>
                      <div className="flex gap-1">
                        <select 
                          className="text-xs bg-transparent border-none text-slate-400 cursor-pointer hover:text-slate-700 outline-none"
                          value={lead.stage}
                          onChange={(e) => handleStageChange(lead.id, e.target.value)}
                        >
                          {stages.map(s => <option key={s} value={s}>Move to {s}</option>)}
                        </select>
                      </div>
                    </div>
                    <p className="font-bold text-slate-800 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400"/> {lead.customer?.displayName}</p>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{lead.requirementSummary}</p>
                    
                    {lead.expectedValue > 0 && (
                      <p className="text-sm font-semibold text-emerald-600 mt-2">₹ {lead.expectedValue?.toLocaleString('en-IN')}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 mb-2">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {lead.source}</span>
                      {lead.activities?.[0] && <span className="flex items-center gap-1 truncate"><MessageCircle className="w-3 h-3"/> {lead.activities[0].type}</span>}
                    </div>

                    {/* Action Buttons */}
                    {stage !== "WON" && stage !== "LOST" && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hidden group-hover:flex items-center justify-center gap-1"
                        onClick={() => handleConfirmOrder(lead.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Order
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
