"use client";

import React from "react";
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
        
        <div className="max-w-md w-full hidden md:flex items-center relative">
          <Search className="h-4 w-4 absolute left-3 text-gray-400" />
          <Input 
            placeholder="Search customers, orders, products..." 
            className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-blue-500 rounded-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu open={bellOpen} onOpenChange={setBellOpen}>
          <DropdownMenuTrigger className="relative outline-none">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white shadow-sm">
                  {unreadCount}
                </span>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-96 overflow-y-auto">
              {notifications.map(n => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start cursor-pointer p-3 border-b" onClick={() => handleRead(n.id)}>
                  <div className="flex justify-between w-full">
                    <span className="font-bold text-sm text-slate-800">{n.title}</span>
                    {!n.readAt && <span className="h-2 w-2 bg-blue-600 rounded-full"></span>}
                  </div>
                  <span className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</span>
                </DropdownMenuItem>
              ))}
              {notifications.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-10 w-10 rounded-full p-0 overflow-hidden ring-2 ring-slate-100 hover:ring-blue-200 transition-all focus-visible:ring-blue-500 outline-none flex items-center justify-center bg-transparent border-0 cursor-pointer">
            <Avatar className="h-full w-full">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 font-bold text-sm">
                  {user?.name?.substring(0, 2).toUpperCase() || "US"}
                </AvatarFallback>
              )}
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-gray-500">{user?.role} - {user?.department}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Preferences</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
