"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { getMyTasks, receiveTask, startTask, submitTask } from "@/app/actions/production";
import { useAuth } from "@/auth/AuthContext";
import { Clock, CheckCircle, Play, Package, Loader2 } from "lucide-react";

export default function CuttingDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const res = await getMyTasks(user.id);
      setTasks(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleAction = async (taskId: string, action: "receive" | "start" | "submit") => {
    setActionLoading(taskId);
    try {
      if (action === "receive") await receiveTask(taskId, user!.id);
      if (action === "start") await startTask(taskId, user!.id);
      if (action === "submit") {
        const task = tasks.find(t => t.id === taskId);
        await submitTask({
          taskId,
          workerId: user!.id,
          goodQty: task.operation?.inputQty ?? 0,
        });
      }
      await fetchTasks();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AppLayout>
      <div className="page-content">
        <div className="page-header">
          <h1 className="text-page-title">My Cutting Tasks</h1>
          <p className="text-muted mt-1">Manage your assigned CNC/Laser jobs</p>
        </div>

        {loading ? (
          <div className="card p-8 flex items-center justify-center text-muted">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state card p-12">
            <CheckCircle className="empty-state-icon text-green-600" />
            <h3 className="text-lg font-medium mt-4">All caught up!</h3>
            <p className="text-muted mt-2">You have no assigned tasks at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => {
              const op = task.operation;
              return (
                <div key={task.id} className="card border-blue-200">
                  <div className="card-header flex justify-between items-start bg-blue-50/30">
                    <div>
                      <span className="badge badge-blue mb-2">{task.taskCode}</span>
                      <h3 className="font-semibold">{op?.stage ?? task.type}</h3>
                    </div>
                    <span className="badge badge-gray">{task.status}</span>
                  </div>
                  <div className="card-body space-y-4">
                    <div>
                      <p className="text-xs text-muted uppercase font-medium">Job Details</p>
                      <p className="text-sm font-medium">{op?.job?.jobNo}</p>
                      <p className="text-sm mt-1">{op?.job?.request?.lines?.[0]?.product?.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted uppercase font-medium">Quantity</p>
                        <p className="font-semibold text-lg">{op?.inputQty ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted uppercase font-medium">Due Date</p>
                        <p className="text-sm flex items-center gap-1 mt-1">
                          <Clock className="w-4 h-4 text-orange-500" />
                          {task.dueAt ? new Date(task.dueAt).toLocaleDateString("en-IN") : "ASAP"}
                        </p>
                      </div>
                    </div>
                    {task.instructions && (
                      <div className="p-3 bg-gray-50 rounded-md text-sm border border-gray-100">
                        {task.instructions}
                      </div>
                    )}
                  </div>
                  <div className="card-footer bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                    {task.status === "ASSIGNED" && (
                      <button 
                        className="btn btn-primary w-full"
                        onClick={() => handleAction(task.id, "receive")}
                        disabled={actionLoading === task.id}
                      >
                        <Package className="w-4 h-4 mr-2" /> Receive Task
                      </button>
                    )}
                    {task.status === "RECEIVED" && (
                      <button 
                        className="btn btn-primary w-full"
                        onClick={() => handleAction(task.id, "start")}
                        disabled={actionLoading === task.id}
                      >
                        <Play className="w-4 h-4 mr-2" /> Start Work
                      </button>
                    )}
                    {task.status === "IN_PROGRESS" && (
                      <button 
                        className="btn btn-primary w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction(task.id, "submit")}
                        disabled={actionLoading === task.id}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}