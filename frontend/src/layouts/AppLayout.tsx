import { BarChart3, Bell, House, Info, LogOut, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useLowStockAlerts } from "../hooks/useLowStockAlerts";
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
  const { data: lowStockAlerts = [] } = useLowStockAlerts();

  useEffect(() => {
    setUnreadCount(getUnreadCount());

    const handleNotificationsChanged = () => setUnreadCount(getUnreadCount());
    window.addEventListener("inventra:notifications-updated", handleNotificationsChanged);

    return () => {
      window.removeEventListener("inventra:notifications-updated", handleNotificationsChanged);
    };
  }, []);

  const bellCount = unreadCount + lowStockAlerts.length;

  const isNotificationsOpen = location.pathname === "/notifications" || location.pathname.startsWith("/notifications/");
  const [returnPath, setReturnPath] = useState("/home");

  const handleBellClick = () => {
    if (isNotificationsOpen) {
      navigate(returnPath);
    } else {
      setReturnPath(location.pathname);
      navigate("/notifications");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="mx-auto w-full max-w-md px-3 pb-20 pt-3 sm:max-w-lg sm:px-4 sm:pb-24 sm:pt-4">
        <header className="mb-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:mb-4 sm:rounded-3xl sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <Link to="/home" className="flex min-w-0 items-center gap-2 sm:gap-3">
              <img src="/favicon.svg" alt="Inventra logo" className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" />
              <div className="min-w-0">
                <h1 className="truncate text-base font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">Inventra</h1>
                <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">Inventory and Parcel Tracking</p>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={handleBellClick}
                aria-label={isNotificationsOpen ? "Close notifications" : "Open notifications"}
                aria-pressed={isNotificationsOpen}
                className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:h-11 sm:w-11 sm:rounded-2xl"
              >
                <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {bellCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white sm:h-4 sm:min-w-4 sm:px-1.5 sm:text-[10px]">
                    {bellCount}
                  </span>
                ) : null}
              </button>
              <div className="flex items-center gap-2 sm:block sm:text-right">
                <div className="hidden sm:block">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
                  <p className="max-w-[140px] truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.first_name || user?.username}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-xl border border-slate-200 p-0 text-slate-500 hover:text-rose-600 dark:border-slate-700 sm:mt-1 sm:h-7 sm:w-auto sm:rounded-2xl sm:border-0 sm:px-2"
                  onClick={handleLogout}
                  aria-label="Logout"
                >
                  <LogOut className="h-3 w-3 sm:mr-1 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="animate-[fadeIn_260ms_ease-out] rounded-2xl border border-slate-100 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/40 sm:rounded-3xl sm:p-3">
          <Outlet />
        </main>

        <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-blue-100 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:bottom-4 sm:w-[calc(100%-2rem)] sm:rounded-3xl sm:p-2">
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-center text-[9px] font-semibold leading-tight transition sm:gap-1 sm:rounded-2xl sm:px-2 sm:py-2 sm:text-xs",
                    isActive ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
