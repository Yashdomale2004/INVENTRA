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
    <div className="w-full space-y-5">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">More Info</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage account details, preferences, and app settings in one place.</p>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-900 dark:bg-slate-800 dark:text-slate-100">
              {userInitials || <UserRound className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Account</p>
              <h2 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">{userName}</h2>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user?.email ?? "No email provided"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-2xl px-4"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              <Moon className="mr-2 h-4 w-4" />
              {resolvedTheme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Settings</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{settings.length + 2} items</span>
        </div>

        <div className="grid gap-3">
          {settings.map(({ label, description, icon: Icon, onClick, isPlain }) => {
            const content = (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{label}</p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">{description}</p>
                </div>
              </div>
            );

            if (isPlain) {
              return (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="flex h-full w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-950"
                >
                  {content}
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                </button>
              );
            }

            return (
              <Button
                key={label}
                type="button"
                variant="outline"
                className="flex h-full w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-950"
                onClick={onClick}
              >
                {content}
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
              </Button>
            );
          })}

          <button
            type="button"
            disabled={resetStockMutation.isPending}
            onClick={() => setShowResetConfirm(true)}
            className="flex h-full w-full items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-left text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300 dark:hover:border-amber-800 dark:hover:bg-amber-900"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-900 dark:text-amber-300">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{resetStockMutation.isPending ? "Resetting Stock..." : "Reset All Stock"}</p>
                <p className="truncate text-sm text-amber-700 dark:text-amber-400">Set every product's stock quantity to zero.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-amber-500" />
          </button>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="flex h-full w-full items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-left text-red-700 transition hover:border-red-300 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:border-red-700 dark:hover:bg-red-900"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700 shadow-sm dark:bg-red-900 dark:text-red-300">
                <LogOut className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">Logout</p>
                <p className="truncate text-sm text-red-600 dark:text-red-300">Sign out of your Inventra account.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-red-500" />
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
