"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthContext";
import { Menu, Bell, Search, LogOut } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

export const Header: React.FC<{ sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void }> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [bellOpen, setBellOpen] = React.useState(false);
  const unreadCount = notifications.filter(n => !n.readAt).length;

  React.useEffect(() => {
    if (user?.email) {
      import('@/app/actions/notifications').then(({ getMyNotifications }) => {
        getMyNotifications(user.email!).then(setNotifications);
      });
      const interval = setInterval(() => {
        import('@/app/actions/notifications').then(({ getMyNotifications }) => {
          getMyNotifications(user.email!).then(setNotifications);
        });
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleReadAndNavigate = async (notification: any) => {
    if (!notification.readAt) {
      const { markNotificationRead } = await import('@/app/actions/notifications');
      await markNotificationRead(notification.id);
      const updated = notifications.map(n => n.id === notification.id ? { ...n, readAt: new Date() } : n);
      setNotifications(updated);
    }
    
    // Navigate based on targetRefType
    if (notification.targetRefType === "Task") {
      router.push("/");
    } else if (notification.targetRefType === "Order") {
      router.push("/invoices"); // Adjust if there's a specific order view
    } else {
      router.push("/");
    }
    
    setBellOpen(false);
  };

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-4 lg:px-8 shadow-sm z-10 flex-shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Company Logo in Header */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img 
            src="https://hanicraft.in/web/assets/images/logo/logo.png" 
            alt="Hanicraft Logo" 
            className="h-8 object-contain"
          />
        </Link>

        <div className="max-w-md w-full hidden md:flex items-center relative ml-4">
          <Search className="h-4 w-4 absolute left-3 text-gray-400" />
          <Input 
            placeholder="Search customers, orders, products..." 
            className="!pl-9 bg-gray-50 border-gray-200 focus-visible:ring-blue-500 rounded-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu open={bellOpen} onOpenChange={setBellOpen}>
          <DropdownMenuTrigger className="relative h-10 w-10 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications ({unreadCount} new)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
              ) : (
                notifications.map(n => (
                  <DropdownMenuItem 
                    key={n.id} 
                    className={`flex flex-col items-start p-3 cursor-pointer ${!n.readAt ? 'bg-blue-50/50' : ''}`}
                    onClick={() => handleReadAndNavigate(n)}
                  >
                    <div className="flex justify-between w-full mb-1">
                      <span className="font-semibold text-sm">{n.title}</span>
                      {!n.readAt && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">New</Badge>}
                    </div>
                    <span className="text-xs text-slate-600 line-clamp-2">{n.message}</span>
                    {n.targetRef && (
                      <span className="text-[10px] text-blue-600 font-semibold mt-2">Click to view &rarr;</span>
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Log out">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
