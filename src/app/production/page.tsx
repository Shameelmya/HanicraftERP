"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { getProductionJobs, getProductionRequests } from "@/app/actions/production";
import { Factory, CheckCircle, Package } from "lucide-react";

export default function ProductionDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getProductionJobs(),
      getProductionRequests({ status: "SUBMITTED" })
    ]).then(([j, r]) => {
      setJobs(j);
      setRequests(r);
      setLoading(false);
    });
  }, []);

  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header">
          <h1 className="text-page-title">Production Board</h1>
          <p className="text-muted mt-1">Manage active jobs and stock requests</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted">Loading production data...</div>
        ) : (
          <div className="space-y-8">
            {/* New Requests Section */}
            <div>
              <h2 className="text-section-title mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                New Requests from Stock ({requests.length})
              </h2>
              {requests.length === 0 ? (
                <div className="card p-6 text-center text-muted border-dashed border-gray-300">
                  No new production requests
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requests.map(req => (
                    <div key={req.id} className="card border-l-4" style={{ borderLeftColor: "#B91C1C" }}>
                      <div className="card-body">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{req.requestNo}</p>
                            <p className="text-sm mt-1">{req.purpose}</p>
                          </div>
                          <span className="badge badge-red">{req.priority}</span>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button className="btn btn-primary btn-sm">Review & Accept</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Jobs Section */}
            <div>
              <h2 className="text-section-title mb-4 flex items-center gap-2">
                <Factory className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                Active Production Jobs
              </h2>
              <div className="card">
                <div className="card-body p-0">
                  {jobs.length === 0 ? (
                    <div className="empty-state p-8">
                      <CheckCircle className="empty-state-icon" style={{ color: "#166534" }} />
                      <p>No active jobs</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Job No</th>
                          <th>Product</th>
                          <th>Target Qty</th>
                          <th>Status</th>
                          <th>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map(job => {
                          const totalOps = job.operations.length || 1;
                          const completedOps = job.operations.filter((o: any) => o.status === "VERIFIED").length;
                          const progress = Math.round((completedOps / totalOps) * 100);

                          return (
                            <tr key={job.id}>
                              <td className="font-medium font-mono">{job.jobNo}</td>
                              <td>{job.request?.lines?.[0]?.product?.name ?? "Multiple"}</td>
                              <td className="font-medium">{job.targetQty}</td>
                              <td>
                                <span className={`badge ${job.status === "IN_PROGRESS" ? "badge-blue" : "badge-gray"}`}>
                                  {job.status}
                                </span>
                              </td>
                              <td className="w-48">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-600 rounded-full" 
                                      style={{ width: `${progress}%` }} 
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-muted">{progress}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
