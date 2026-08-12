import {
  BarChart3,
  Bell,
  ClipboardList,
  House,
  Info,
  ListChecks,
  LogOut,
  PackageCheck,
  PackagePlus,
  Settings,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useInactivityLogout } from "../hooks/useInactivityLogout";
import { useLowStockAlerts } from "../hooks/useLowStockAlerts";
import { cn } from "../lib/utils";
import { getUnreadCount } from "../lib/notificationsStorage";

const navItems = [
  { to: "/home", label: "Home", icon: House },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/track", label: "Track", icon: Truck },
  { to: "/more", label: "More Info", icon: Info },
];

// "Order Summary" doesn't have its own route: it links to the Order Summary
// panel on the Home dashboard.
const desktopNavItems = [
  { to: "/dashboard", label: "Reports", icon: BarChart3 },
  { to: "/stock-up", label: "Stock Up", icon: PackagePlus },
  { to: "/enquiry", label: "Enquiry", icon: ClipboardList },
  { to: "/home", label: "Order Summary", icon: ListChecks },
  { to: "/track", label: "Track", icon: Truck },
  { to: "/delivered-orders", label: "Delivered Orders", icon: PackageCheck },
  { to: "/more", label: "More Info", icon: Info },
  { to: "/management", label: "Management", icon: Settings },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useInactivityLogout();

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
    <div className="min-h-screen bg-white dark:bg-slate-950 lg:flex">
      {/* ── Desktop sidebar (lg+ only) ───────────────────────────────── */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-white/10 lg:bg-[#050914] lg:px-4 lg:py-6">
        <Link to="/home" className="flex items-center gap-2.5 px-2">
          <img src="/logo.png" alt="Inventra logo" className="h-9 w-9" />
          <span className="text-lg font-black tracking-[0.2em] text-white">INVENTRA</span>
        </Link>

        <nav className="mt-8 flex-1 space-y-1">
          {desktopNavItems.map((item, index) => {
            const Icon = item.icon;
            // Only the first item pointing at a given route gets highlighted, so
            // "Dashboard" and "Order Summary" (both /home) don't both light up.
            const isActive =
              (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)) &&
              desktopNavItems.findIndex((other) => other.to === item.to) === index;

            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  isActive
                    ? "bg-white/10 font-semibold text-white shadow-sm ring-1 ring-white/10"
                    : "font-normal text-white/70 hover:bg-white/5 hover:text-white/90"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-300">
              {(user?.first_name || user?.username || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.first_name || user?.username}</p>
              <p className="truncate text-xs text-white/40">Signed in</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-white/50 transition hover:bg-white/5 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* ── Shared content column (mobile chrome + single Outlet) ───── */}
      <div className="mx-auto w-full max-w-md px-3 pb-20 pt-3 sm:max-w-lg sm:px-4 sm:pb-24 sm:pt-4 md:max-w-3xl lg:mx-0 lg:ml-64 lg:max-w-none lg:flex-1 lg:px-8 lg:pb-8 lg:pt-6">
        {/* Mobile/tablet header — unchanged, hidden at lg+ */}
        <header className="mb-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:mb-4 sm:rounded-3xl sm:p-4 lg:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <Link to="/home" className="flex min-w-0 items-center gap-2 sm:gap-3">
              <img src="/logo.png" alt="Inventra logo" className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" />
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

        {/* Desktop topbar — hidden below lg */}
        <header className="mb-6 hidden items-center justify-between lg:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Inventra</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">Inventory &amp; Parcel Tracking</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBellClick}
              aria-label={isNotificationsOpen ? "Close notifications" : "Open notifications"}
              aria-pressed={isNotificationsOpen}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <Bell className="h-4 w-4" />
              {bellCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {bellCount}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        <main className="animate-[fadeIn_260ms_ease-out] rounded-2xl border border-slate-100 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-900/40 sm:rounded-3xl sm:p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:dark:bg-transparent">
          <Outlet />
        </main>

        {/* Mobile/tablet bottom nav — unchanged, hidden at lg+ */}
        <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-blue-100 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:bottom-4 sm:w-[calc(100%-2rem)] sm:rounded-3xl sm:p-2 lg:hidden">
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
