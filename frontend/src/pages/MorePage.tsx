import { BellRing, ChevronRight, FileText, HelpCircle, Info, Lock, LogOut, Moon, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { getErrorMessage } from "../lib/errors";
import { notifyInventorySync } from "../lib/inventorySync";
import { resetInventoryToZero } from "../services/inventory";

export function MorePage() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const resetStockMutation = useMutation({
    mutationFn: resetInventoryToZero,
    onSuccess: async () => {
      toast.success("All stock reset to zero.");
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-by-brand"] });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product-sizes"] });
      notifyInventorySync();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Could not reset stock."));
    },
  });

  const confirmResetStock = () => {
    setShowResetConfirm(false);
    resetStockMutation.mutate();
  };

  const userName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Inventra User";
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const settings: Array<{
    label: string;
    description: string;
    icon: typeof Lock;
    onClick: () => void;
    isPlain?: boolean;
  }> = [
    { label: "Notifications", description: "View and manage alerts in one place.", icon: BellRing, onClick: () => navigate("/notifications") },
    { label: "Dark Mode", description: "Toggle between light and dark themes.", icon: Moon, onClick: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"), isPlain: true },
    { label: "About App", description: "Learn more about Inventra and its features.", icon: Info, onClick: () => navigate("/about") },
    { label: "Privacy Policy", description: "Read our privacy commitments.", icon: ShieldCheck, onClick: () => navigate("/privacy-policy") },
    { label: "Terms & Conditions", description: "Review the app terms.", icon: FileText, onClick: () => navigate("/terms") },
    { label: "Contact Support", description: "Get help for your account and inventory.", icon: HelpCircle, onClick: () => navigate("/support") },
  ];

  return (
    <div className="w-full space-y-3 pb-8 sm:space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">More Info</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Manage account details, preferences, and app settings in one place.</p>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-base font-black text-slate-900 dark:bg-slate-800 dark:text-slate-100 sm:h-16 sm:w-16 sm:rounded-2xl sm:text-xl">
              {userInitials || <UserRound className="h-5 w-5 sm:h-6 sm:w-6" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Account</p>
              <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">{userName}</h2>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{user?.email ?? "No email provided"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl px-3 sm:h-10 sm:rounded-2xl sm:px-4"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              <Moon className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
              {resolvedTheme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl sm:p-4">
        <div className="mb-2.5 flex items-center justify-between gap-3 px-1 sm:mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500 sm:text-sm">Settings</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:px-2.5 sm:py-1">{settings.length + 2} items</span>
        </div>

        <div className="grid min-w-0 gap-2.5 sm:gap-3">
          {settings.map(({ label, description, icon: Icon, onClick, isPlain }) => {
            const content = (
              <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-100 sm:h-11 sm:w-11 sm:rounded-2xl">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">{label}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{description}</p>
                </div>
              </div>
            );

            if (isPlain) {
              return (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="flex h-full w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-950 sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-3.5"
                >
                  {content}
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 sm:h-4 sm:w-4" />
                </button>
              );
            }

            return (
              <Button
                key={label}
                type="button"
                variant="outline"
                className="flex h-full w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-950 sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-3.5"
                onClick={onClick}
              >
                {content}
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 sm:h-4 sm:w-4" />
              </Button>
            );
          })}

          <button
            type="button"
            disabled={resetStockMutation.isPending}
            onClick={() => setShowResetConfirm(true)}
            className="flex h-full w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-left text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300 dark:hover:border-amber-800 dark:hover:bg-amber-900 sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-3.5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-900 dark:text-amber-300 sm:h-11 sm:w-11 sm:rounded-2xl">
                <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold sm:text-base">{resetStockMutation.isPending ? "Resetting Stock..." : "Reset All Stock"}</p>
                <p className="truncate text-xs text-amber-700 dark:text-amber-400 sm:text-sm">Set every product's stock quantity to zero.</p>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-amber-500 sm:h-4 sm:w-4" />
          </button>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="flex h-full w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-left text-red-700 transition hover:border-red-300 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:border-red-700 dark:hover:bg-red-900 sm:gap-4 sm:rounded-2xl sm:px-4 sm:py-3.5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-red-100 text-red-700 shadow-sm dark:bg-red-900 dark:text-red-300 sm:h-11 sm:w-11 sm:rounded-2xl">
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold sm:text-base">Logout</p>
                <p className="truncate text-xs text-red-600 dark:text-red-300 sm:text-sm">Sign out of your Inventra account.</p>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-red-500 sm:h-4 sm:w-4" />
          </button>
        </div>
      </Card>

      <ConfirmDialog
        open={showResetConfirm}
        title="Are you sure you want to reset stock?"
        description="This will set every product's stock quantity to zero across Inventra. This cannot be undone."
        confirmLabel={resetStockMutation.isPending ? "Resetting..." : "Yes"}
        cancelLabel="No"
        onConfirm={confirmResetStock}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
