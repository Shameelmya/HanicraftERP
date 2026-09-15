"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getWorkerTasks, startWorkerTask, completeWorkerTask } from "@/app/actions/worker";
import { CheckCircle2, Play, AlertCircle, Clock } from "lucide-react";

export default function ShopFloorPortal() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!user?.email) return;
    try {
      setLoading(true);
      const data = await getWorkerTasks(user.email);
      setTasks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleStart = async (taskId: string) => {
    if (!user?.email) return;
    try {
      await startWorkerTask(taskId, user.email);
      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleComplete = async (taskId: string, targetQty: number) => {
    if (!user?.email) return;
    try {
      await completeWorkerTask(taskId, user.email, targetQty);
      fetchTasks();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <AppLayout><div className="p-8 flex justify-center"><div className="animate-pulse">Loading your tasks...</div></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Daily Tasks</h1>
          <p className="text-slate-500">Welcome back, {user?.name}. Here is what you need to work on today.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-slate-700">You're all caught up!</h3>
              <p className="text-slate-500">No pending tasks assigned to you right now.</p>
            </div>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all hover:shadow-md">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded-md uppercase tracking-wide">
                      {task.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due {new Date(task.dueAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">Job: {task.operation?.job?.jobNo || task.taskCode}</h3>
                  <p className="text-slate-600 text-sm mt-1">{task.instructions || "Follow standard operating procedures."}</p>
                </div>
                
                <div className="w-full sm:w-auto">
                  {task.status === "ASSIGNED" || task.status === "RECEIVED" ? (
                    <button 
                      onClick={() => handleStart(task.id)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98]"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Start Task
                    </button>
                  ) : task.status === "IN_PROGRESS" ? (
                    <button 
                      onClick={() => handleComplete(task.id, task.operation?.inputQty || 1)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Mark Complete
                    </button>
                  ) : (
                    <span className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium">
                      {task.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
