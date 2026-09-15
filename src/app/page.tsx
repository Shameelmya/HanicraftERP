"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/auth/AuthContext";
import { useEffect, useState } from "react";
import { getDashboardStats, getMyNotifications } from "./actions/dashboard";
import {
  ShoppingCart,
  CreditCard,
  Package,
  Factory,
  Users,
  TrendingUp,
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Layers,
} from "lucide-react";
import Link from "next/link";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

const gradientMap: Record<string, { bg: string, iconBg: string, text: string, titleText: string, subText: string }> = {
  "#1D4ED8": { bg: "bg-gradient-to-br from-blue-400 to-indigo-500", iconBg: "bg-white/20", text: "text-white", titleText: "text-blue-50", subText: "text-blue-100" }, // Blue
  "#166534": { bg: "bg-gradient-to-br from-emerald-400 to-teal-500", iconBg: "bg-white/20", text: "text-white", titleText: "text-emerald-50", subText: "text-emerald-100" }, // Green
  "#6D28D9": { bg: "bg-gradient-to-br from-fuchsia-400 to-purple-500", iconBg: "bg-white/20", text: "text-white", titleText: "text-fuchsia-50", subText: "text-fuchsia-100" }, // Purple
  "#0F766E": { bg: "bg-gradient-to-br from-cyan-400 to-blue-500", iconBg: "bg-white/20", text: "text-white", titleText: "text-cyan-50", subText: "text-cyan-100" }, // Teal
  "#92400E": { bg: "bg-gradient-to-br from-orange-400 to-rose-400", iconBg: "bg-white/20", text: "text-white", titleText: "text-orange-50", subText: "text-orange-100" }, // Orange
  "#B91C1C": { bg: "bg-gradient-to-br from-rose-400 to-red-500", iconBg: "bg-white/20", text: "text-white", titleText: "text-rose-50", subText: "text-rose-100" }, // Red
};

function StatCard({ label, value, sub, icon: Icon, color, href }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string; href?: string;
}) {
  const theme = gradientMap[color] || { bg: "bg-gradient-to-br from-slate-400 to-slate-500", iconBg: "bg-white/20", text: "text-white", titleText: "text-slate-50", subText: "text-slate-100" };
  
  const inner = (
    <div className={`p-6 rounded-xl shadow-sm border-0 transition-all hover:shadow-md ${theme.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${theme.titleText}`}>{label}</p>
          <p className={`text-3xl font-extrabold ${theme.text}`}>{value}</p>
          {sub && <p className={`text-xs mt-2 font-medium ${theme.subText}`}>{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl shadow-sm ${theme.iconBg}`}>
          <Icon className={`w-6 h-6 ${theme.text}`} />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="hover:no-underline hover:-translate-y-1 block transition-transform">{inner}</Link> : inner;
}

function TaskCard({ task }: { task: any }) {
  const statusColor = task.status === "ASSIGNED" ? "#1D4ED8" : task.status === "IN_PROGRESS" ? "#6D28D9" : "#166534";
  return (
    <div className="task-card">
      <div className="task-card-header">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{task.taskCode}</p>
          <p className="text-muted mt-0.5">
            {task.operation?.job?.request?.lines?.[0]?.description ?? task.type}
          </p>
        </div>
        <span className="badge" style={{ background: `${statusColor}15`, color: statusColor }}>
          {task.status.replace("_", " ")}
        </span>
      </div>
      {task.dueAt && (
        <p className="flex items-center gap-1" style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          <Clock className="w-3 h-3" />
          Due: {new Date(task.dueAt).toLocaleDateString("en-IN")}
        </p>
      )}
      <div className="task-card-actions">
        <Link href={`/cutting`} className="btn btn-primary btn-sm">View Task</Link>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDashboardStats(user.id, user.role),
      getMyNotifications(user.id),
    ]).then(([s, n]) => {
      setStats(s);
      setNotifications(n.notifications ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const role = user?.role ?? "";

  return (
    <AppLayout>
      <div className="page-content">
        {/* Page header */}
        <div className="page-header flex items-start justify-between">
          <div>
            <h1 className="text-page-title">
              {role === "Operator" || role === "Finishing_Supervisor" ? "My Work" : "Dashboard"}
            </h1>
            <p style={{ color: "var(--color-text-secondary)", marginTop: "4px" }}>
              Good morning, <strong>{user?.name}</strong> · {user?.department ?? user?.jobTitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {notifications.filter(n => !n.readAt).length > 0 && (
              <div className="flex items-center gap-2 badge badge-blue">
                <Bell className="w-3.5 h-3.5" />
                {notifications.filter(n => !n.readAt).length} unread
              </div>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-md" />
            ))}
          </div>
        )}

        {/* MD / GM Dashboard */}
        {!loading && stats && (role === "MD" || role === "GM") && (
          <>
            <div className="grid grid-cols-4 gap-6 mb-6">
              <StatCard label="Open Orders" value={stats.openOrders ?? 0} sub="this month" icon={ShoppingCart} color="#1D4ED8" href="/sales" />
              <StatCard label="Monthly Collections" value={formatINR(stats.monthRevenue ?? 0)} sub="receipts posted" icon={CreditCard} color="#166534" href="/finance" />
              <StatCard label="Active Jobs" value={stats.activeJobs ?? 0} sub="in production" icon={Factory} color="#6D28D9" href="/production" />
              <StatCard label="Employees" value={stats.employeeCount ?? 0} sub="active accounts" icon={Users} color="#0F766E" href="/admin/employees" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h2 className="text-section-title">Recent Orders</h2>
                  <Link href="/sales" className="btn btn-ghost btn-sm">View All <ArrowRight className="w-3 h-3" /></Link>
                </div>
                <div className="card-body p-0">
                  {(stats.recentOrders ?? []).length === 0 ? (
                    <div className="empty-state p-8">
                      <ShoppingCart className="empty-state-icon" />
                      <p>No orders yet</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Customer</th>
                          <th>Status</th>
                          <th className="text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(stats.recentOrders ?? []).map((order: any) => (
                          <tr key={order.id}>
                            <td>
                              <Link href={`/sales/${order.id}`} className="font-medium text-sm" style={{ color: "var(--color-primary)" }}>
                                {order.orderNo}
                              </Link>
                            </td>
                            <td className="text-sm">{order.customer?.displayName}</td>
                            <td>
                              <span className={`badge ${order.commercialStatus === "CONFIRMED" ? "badge-blue" : "badge-gray"}`}>
                                {order.commercialStatus}
                              </span>
                            </td>
                            <td className="text-right text-sm text-tabular">
                              {formatINR(order.totalPayable)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              {/* Notifications */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-section-title">Recent Activity</h2>
                </div>
                <div className="card-body p-0">
                  {notifications.length === 0 ? (
                    <div className="empty-state p-6">
                      <Bell className="empty-state-icon" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.slice(0, 8).map((n) => (
                        <div key={n.id} className="flex items-start gap-3 p-4 border-b border-gray-50 last:border-b-0">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.readAt ? "bg-gray-300" : "bg-blue-600"}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{n.title}</p>
                            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{n.message}</p>
                            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                              {new Date(n.createdAt).toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sales Dashboard */}
        {!loading && stats && role === "Sales" && (
          <>
            <div className="grid grid-cols-3 gap-6 mb-6">
              <StatCard label="Open Leads" value={stats.myLeads ?? 0} icon={Users} color="#1D4ED8" href="/customers" />
              <StatCard label="Open Orders" value={stats.openOrders ?? 0} icon={ShoppingCart} color="#0F766E" href="/sales" />
              <StatCard label="Ready for Pickup" value={stats.readyOrders ?? 0} sub="awaiting dispatch" icon={CheckCircle} color="#166534" href="/sales?status=READY" />
            </div>
            <div className="card">
              <div className="card-header">
                <h2 className="text-section-title">Quick Actions</h2>
              </div>
              <div className="card-body flex gap-4">
                <Link href="/sales/new" className="btn btn-primary btn-lg">
                  <ShoppingCart className="w-4 h-4" /> New Sale
                </Link>
                <Link href="/customers" className="btn btn-secondary btn-lg">
                  <Users className="w-4 h-4" /> Find Customer
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Finance Dashboard */}
        {!loading && stats && role === "Finance" && (
          <div className="grid grid-cols-3 gap-6 mb-6">
            <StatCard label="Pending Advance" value={stats.pending ?? 0} sub="orders awaiting payment" icon={AlertTriangle} color="#92400E" href="/finance" />
            <StatCard label="Monthly Collections" value={formatINR(stats.monthCollections ?? 0)} icon={CreditCard} color="#166534" href="/finance" />
            <StatCard label="Overdue" value={stats.overdueCount ?? 0} sub="past promise date" icon={Clock} color="#B91C1C" href="/finance?filter=overdue" />
          </div>
        )}

        {/* Stock Dashboard */}
        {!loading && stats && role === "Stock" && (
          <div className="grid grid-cols-4 gap-6 mb-6">
            <StatCard label="Active Products" value={stats.totalActive ?? 0} icon={Package} color="#0F766E" href="/stock" />
            <StatCard label="Needs Verification" value={stats.belowMin ?? 0} sub="unverified stock items" icon={AlertTriangle} color="#92400E" href="/stock?filter=verify" />
            <StatCard label="Pending Receipts" value={stats.pendingReceipts ?? 0} sub="from production" icon={Factory} color="#6D28D9" href="/stock?filter=receipts" />
            <StatCard label="Fulfilment Queue" value={stats.pendingFulfil ?? 0} sub="advance cleared orders" icon={Layers} color="#1D4ED8" href="/stock?filter=fulfil" />
          </div>
        )}

        {/* Production Dashboard */}
        {!loading && stats && role === "Production_Supervisor" && (
          <div className="grid grid-cols-3 gap-6 mb-6">
            <StatCard label="New Requests" value={stats.pendingRequests ?? 0} sub="from Stock" icon={Package} color="#B91C1C" href="/production" />
            <StatCard label="Active Jobs" value={stats.activeJobs ?? 0} icon={Factory} color="#6D28D9" href="/production?filter=active" />
            <StatCard label="Overdue Jobs" value={stats.overdueJobs ?? 0} sub="past planned end" icon={AlertTriangle} color="#92400E" href="/production?filter=overdue" />
          </div>
        )}

        {/* Operator / Worker Dashboard */}
        {!loading && stats && (role === "Operator" || role === "Finishing_Supervisor") && (
          <>
            <div className="mb-6">
              <h2 className="text-section-title mb-4">My Assigned Tasks</h2>
              {(stats.myTasks ?? []).length === 0 ? (
                <div className="empty-state card p-8">
                  <CheckCircle className="empty-state-icon" style={{ color: "#166534" }} />
                  <p style={{ color: "var(--color-text-secondary)" }}>No tasks assigned. Check back shortly.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {(stats.myTasks ?? []).map((task: any) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
