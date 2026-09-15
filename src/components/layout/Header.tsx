"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import { Menu, Bell, Search, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const Header: React.FC<{ sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void }> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [bellOpen, setBellOpen] = React.useState(false);
  const unreadCount = notifications.filter(n => !n.readAt).length;

  React.useEffect(() => {
    if (user?.email) {
      import('@/app/actions/notifications').then(({ getMyNotifications }) => {
        getMyNotifications(user.email!).then(setNotifications);
      });
      // Poll every 60 seconds to prevent DB connection exhaustion
      const interval = setInterval(() => {
        import('@/app/actions/notifications').then(({ getMyNotifications }) => {
          getMyNotifications(user.email!).then(setNotifications);
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleRead = async (id: string) => {
    const { markNotificationRead } = await import('@/app/actions/notifications');
    await markNotificationRead(id);
    const updated = notifications.map(n => n.id === id ? { ...n, readAt: new Date() } : n);
    setNotifications(updated);
  };

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 lg:px-8 shadow-sm z-10 flex-shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Company Logo in Header */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-black text-sm">H</span>
          </div>
          <span className="font-extrabold text-lg text-slate-800 tracking-tight hidden sm:block">Hanicraft</span>
        </div>

        <div className="max-w-md w-full hidden md:flex items-center relative ml-4">
          <Search className="h-4 w-4 absolute left-3 text-gray-400" />
          <Input 
            placeholder="Search customers, orders, products..." 
            className="!pl-9 bg-gray-50 border-gray-200 focus-visible:ring-blue-500 rounded-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="destructive" size="sm" onClick={logout} className="font-bold tracking-wide shadow-sm">
          Log out
        </Button>
      </div>
    </header>
  );
};
