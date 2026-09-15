"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { getLeads, createLead, updateLeadStage } from "@/app/actions/leads";
import { Search, Plus, Filter, Phone, User, MessageCircle, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newLead, setNewLead] = useState({ customerName: "", phone: "", source: "PHONE", requirementSummary: "", expectedValue: 0 });

  const fetchLeads = async () => {
    const data = await getLeads();
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleAdd = async () => {
    if (!newLead.customerName || !newLead.phone) return;
    setLoading(true);
    try {
      await createLead(newLead);
      setIsAdding(false);
      setNewLead({ customerName: "", phone: "", source: "PHONE", requirementSummary: "", expectedValue: 0 });
      await fetchLeads();
    } catch (e) {
      alert("Error adding lead");
      setLoading(false);
    }
  };

  const handleStageChange = async (leadId: string, stage: string) => {
    await updateLeadStage(leadId, stage);
    await fetchLeads();
  };

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

        {isAdding && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Add New Lead</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1">Customer Name *</label>
                <Input value={newLead.customerName} onChange={e => setNewLead({...newLead, customerName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone Number *</label>
                <Input value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm mb-1">Source</label>
                <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm" value={newLead.source} onChange={e => setNewLead({...newLead, source: e.target.value})}>
                  <option value="PHONE">Phone</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="WALK_IN">Walk-in</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="EXHIBITION">Exhibition</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Expected Value (₹)</label>
                <Input type="number" value={newLead.expectedValue} onChange={e => setNewLead({...newLead, expectedValue: Number(e.target.value)})} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm mb-1">Requirement Summary</label>
                <Input value={newLead.requirementSummary} onChange={e => setNewLead({...newLead, requirementSummary: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Save Lead</Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-6 gap-2 pb-4">
          {stages.map(stage => (
            <div key={stage} className="bg-slate-50/50 rounded-lg border p-2 flex flex-col h-full min-w-[150px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700">{stage}</h3>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {leads.filter(l => l.stage === stage).length}
                </span>
              </div>
              
              <div className="space-y-3">
                {leads.filter(l => l.stage === stage).map(lead => (
                  <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all">
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
                      <p className="text-sm font-semibold text-emerald-600 mt-2">₹ {lead.expectedValue.toLocaleString('en-IN')}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {lead.source}</span>
                      {lead.activities?.[0] && <span className="flex items-center gap-1 truncate"><MessageCircle className="w-3 h-3"/> {lead.activities[0].type}</span>}
                    </div>
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
