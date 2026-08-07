import { BarChart3, Bell, House, Info, LogOut, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import { getUnreadCount } from "../lib/notificationsStorage";

const navItems = [
  { to: "/home", label: "Home", icon: House },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/track", label: "Track", icon: Truck },
  { to: "/more", label: "More Info", icon: Info },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(getUnreadCount());

    const handleNotificationsChanged = () => setUnreadCount(getUnreadCount());
    window.addEventListener("inventra:notifications-updated", handleNotificationsChanged);

    return () => {
      window.removeEventListener("inventra:notifications-updated", handleNotificationsChanged);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-4 sm:max-w-lg">
        <header className="mb-4 rounded-3xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <Link to="/home" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">I</div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">Inventra</h1>
                <p className="text-xs text-slate-500">Inventory and Parcel Tracking</p>
              </div>
            </Link>

            <div className="flex items-center gap-3 text-right">
              <Link to="/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </Link>
              <div>
                <p className="text-xs text-slate-500">Signed in as</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.first_name || user?.username}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs text-slate-500 hover:text-rose-600"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-1 h-3.5 w-3.5" /> Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="animate-[fadeIn_260ms_ease-out] rounded-3xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <Outlet />
        </main>

        <nav className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-3xl border border-blue-100 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="grid grid-cols-4 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold transition",
                    isActive ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
