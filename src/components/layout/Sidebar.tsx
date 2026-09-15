"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Scissors,
  Paintbrush,
  Droplet,
  Truck,
  Receipt,
  FileText,
  Settings,
  Factory,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  CheckSquare,
  Bell,
  Archive,
  ClipboardList,
  Boxes,
} from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  allowedRoles?: string[];
};

type NavGroup = {
  title: string;
  allowedRoles?: string[]; // if undefined, all roles see it
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { name: "My Work", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "CUSTOMERS & SALES",
    allowedRoles: ["MD", "GM", "Sales"],
    items: [
      { name: "Leads", href: "/sales/leads", icon: Users },
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Sales Orders", href: "/sales", icon: ShoppingCart },
    ],
  },
  {
    title: "FINANCE",
    allowedRoles: ["MD", "GM", "Finance"],
    items: [
      { name: "Finance", href: "/finance", icon: CreditCard },
      { name: "Invoices", href: "/invoices", icon: Receipt },
      { name: "Reports", href: "/reports", icon: FileText },
    ],
  },
  {
    title: "STOCK",
    allowedRoles: ["MD", "GM", "Stock"],
    items: [
      { name: "Stock", href: "/stock", icon: Boxes },
      { name: "Dispatch", href: "/dispatch", icon: Truck },
    ],
  },
  {
    title: "PRODUCTION",
    allowedRoles: ["MD", "GM", "Production_Supervisor", "Finishing_Supervisor", "Operator", "QC"],
    items: [
      { name: "Production", href: "/production", icon: Factory, allowedRoles: ["MD", "GM", "Production_Supervisor"] },
      { name: "Cutting", href: "/cutting", icon: Scissors, allowedRoles: ["MD", "GM", "Production_Supervisor", "Operator"] },
      { name: "Finishing", href: "/finishing", icon: Paintbrush, allowedRoles: ["MD", "GM", "Finishing_Supervisor", "Operator"] },
      { name: "Acrylic", href: "/acrylic", icon: Droplet, allowedRoles: ["MD", "GM", "Operator"] },
      { name: "QC", href: "/qc", icon: CheckSquare, allowedRoles: ["MD", "GM", "QC", "Production_Supervisor"] },
    ],
  },
  {
    title: "ADMIN",
    allowedRoles: ["MD", "GM", "Admin"],
    items: [
      { name: "Products", href: "/admin/products", icon: Package },
      { name: "Employees", href: "/admin/employees", icon: Users },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<{ open: boolean; setOpen: (v: boolean) => void }> = ({ open, setOpen }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const userRoles = user?.roles ?? [];

  const canSeeGroup = (group: NavGroup) => {
    if (!group.allowedRoles) return true;
    if (userRoles.length === 0) return true; // unauthenticated — let page handle redirect
    return group.allowedRoles.some((r) => userRoles.includes(r));
  };

  const canSeeItem = (item: NavItem) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.some((r) => userRoles.includes(r));
  };

  const visibleGroups = navGroups
    .filter(canSeeGroup)
    .map((g) => ({ ...g, items: g.items.filter(canSeeItem) }))
    .filter((g) => g.items.length > 0);

  // Department accent colour for active items
  const getDeptAccent = (href: string) => {
    if (["/customers", "/sales"].includes(href)) return "text-blue-600 bg-blue-50";
    if (["/finance", "/invoices"].includes(href)) return "text-green-700 bg-green-50";
    if (["/stock", "/dispatch"].includes(href)) return "text-teal-700 bg-teal-50";
    if (["/production", "/cutting"].includes(href)) return "text-violet-700 bg-violet-50";
    if (["/finishing"].includes(href)) return "text-amber-800 bg-amber-50";
    if (["/acrylic"].includes(href)) return "text-rose-700 bg-rose-50";
    if (["/qc"].includes(href)) return "text-cyan-700 bg-cyan-50";
    return "text-blue-600 bg-blue-50";
  };

  return (
    <aside
      className={`${open ? "w-60" : "w-16"} transition-all duration-200 ease-in-out flex-shrink-0 bg-white border-r border-gray-200 flex flex-col z-20 relative`}
      style={{ minHeight: "100vh" }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        {open ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <div className="min-w-0">
                <div className="font-bold text-gray-900 text-sm truncate">Hanicraft</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => setOpen(true)} className="w-full flex justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {visibleGroups.map((group, gi) => (
          <div key={gi} className="mb-4">
            {open && (
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">
                {group.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                const activeClass = getDeptAccent(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={!open ? item.name : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 font-bold ${
                        isActive
                          ? `${activeClass} font-extrabold shadow-sm`
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "" : "text-gray-400"}`} />
                      {open && <span className="truncate flex-1">{item.name}</span>}
                      {open && item.badge && item.badge > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User profile moved to bottom of sidebar */}
      <div className="border-t border-gray-100 p-3">
        {user && (
          <Link href="/settings" className={`flex items-center ${open ? 'gap-3 px-2 py-2' : 'justify-center'} rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors`}>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            {open && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-900 truncate">{user.name}</div>
                <div className="text-[10px] text-gray-500 truncate uppercase tracking-wider">{user.role}</div>
              </div>
            )}
          </Link>
        )}
      </div>
    </aside>
  );
};
