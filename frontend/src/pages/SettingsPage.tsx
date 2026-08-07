import { BellRing, Download, FileDown, FileText, FileUp, HelpCircle, Info, Languages, Lock, LogOut, Moon, Package2, ShieldQuestion, Sun, Upload, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { fetchAppSettings, saveAppSetting } from "../services/settings";

type LocalSettings = {
  notificationsEnabled: boolean;
  lowStockAlert: boolean;
  notificationSound: boolean;
  lowStockThreshold: number;
  defaultUnit: string;
  appLock: boolean;
  fingerprintLogin: boolean;
  language: string;
};

const LOCAL_SETTINGS_KEY = "inventra_settings";
const INVENTRA_VERSION = "1.0.0";

function getInitialLocalSettings(): LocalSettings {
  if (typeof window === "undefined") {
    return {
      notificationsEnabled: true,
      lowStockAlert: true,
      notificationSound: true,
      lowStockThreshold: 10,
      defaultUnit: "Pieces",
      appLock: false,
      fingerprintLogin: false,
      language: "English",
    };
  }

  const stored = window.localStorage.getItem(LOCAL_SETTINGS_KEY);
  if (!stored) {
    return {
      notificationsEnabled: true,
      lowStockAlert: true,
      notificationSound: true,
      lowStockThreshold: 10,
      defaultUnit: "Pieces",
      appLock: false,
      fingerprintLogin: false,
      language: "English",
    };
  }

  try {
    return { ...getInitialLocalSettings(), ...JSON.parse(stored) } as LocalSettings;
  } catch {
    return {
      notificationsEnabled: true,
      lowStockAlert: true,
      notificationSound: true,
      lowStockThreshold: 10,
      defaultUnit: "Pieces",
      appLock: false,
      fingerprintLogin: false,
      language: "English",
    };
  }
}

function saveLocalSettings(next: LocalSettings) {
  window.localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(next));
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
      <div>
        <p className="font-medium text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Button type="button" variant={checked ? "default" : "outline"} size="sm" onClick={onToggle}>
        {checked ? "On" : "Off"}
      </Button>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-300">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

export function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["app-settings"], queryFn: fetchAppSettings });
  const [localSettings, setLocalSettings] = useState<LocalSettings>(getInitialLocalSettings);

  const mutation = useMutation({
    mutationFn: saveAppSetting,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Appearance saved.");
    },
    onError: () => toast.error("Could not save appearance setting."),
  });

  useEffect(() => {
    const current = settings?.[0];
    if (current) {
      setTheme(current.dark_mode ? "dark" : "light");
    }
  }, [settings, setTheme]);

  useEffect(() => {
    saveLocalSettings(localSettings);
  }, [localSettings]);

  const applyTheme = (mode: "light" | "dark") => {
    setTheme(mode);
    mutation.mutate({ dark_mode: mode === "dark" });
  };

  const exportFile = (format: "excel" | "pdf" | "backup") => {
    toast.success(`${format.toUpperCase()} export started.`);
  };

  const languageOptions = useMemo(() => ["English", "Hindi", "Marathi"], []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Settings</h2>
        <p className="text-sm text-slate-500">Manage your account, appearance, inventory defaults, and app preferences.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard icon={UserRound} title="Account">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" className="justify-start gap-3" onClick={() => navigate("/profile")}>
              <UserRound className="h-4 w-4" /> Profile
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-3" onClick={() => navigate("/profile")}>
              <Lock className="h-4 w-4" /> Change Password
            </Button>
          </div>
        </SectionCard>

        <SectionCard icon={Sun} title="Appearance">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant={resolvedTheme === "light" ? "default" : "outline"} onClick={() => applyTheme("light")}>
              <Sun className="mr-2 h-4 w-4" /> Light Mode
            </Button>
            <Button type="button" variant={resolvedTheme === "dark" ? "default" : "outline"} onClick={() => applyTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" /> Dark Mode
            </Button>
          </div>
        </SectionCard>

        <SectionCard icon={BellRing} title="Notifications">
          <ToggleRow
            label="Enable Notifications"
            description="Turn app notifications on or off."
            checked={localSettings.notificationsEnabled}
            onToggle={() => setLocalSettings((current) => ({ ...current, notificationsEnabled: !current.notificationsEnabled }))}
          />
          <ToggleRow
            label="Low Stock Alert"
            description="Receive alerts when a product size falls below threshold."
            checked={localSettings.lowStockAlert}
            onToggle={() => setLocalSettings((current) => ({ ...current, lowStockAlert: !current.lowStockAlert }))}
          />
          <ToggleRow
            label="Notification Sound"
            description="Play a sound for stock warnings and alerts."
            checked={localSettings.notificationSound}
            onToggle={() => setLocalSettings((current) => ({ ...current, notificationSound: !current.notificationSound }))}
          />
        </SectionCard>

        <SectionCard icon={Package2} title="Inventory">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Low Stock Threshold</label>
              <Input
                type="number"
                min="0"
                value={localSettings.lowStockThreshold}
                onChange={(e) => setLocalSettings((current) => ({ ...current, lowStockThreshold: Number(e.target.value || 0) }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Default Unit</label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
                value={localSettings.defaultUnit}
                onChange={(e) => setLocalSettings((current) => ({ ...current, defaultUnit: e.target.value }))}
              >
                <option>Pieces</option>
                <option>Boxes</option>
                <option>Dozens</option>
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Download} title="Data">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => exportFile("excel")}>
              <FileUp className="h-4 w-4" /> Export to Excel
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => exportFile("pdf")}>
              <FileDown className="h-4 w-4" /> Export to PDF
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => exportFile("backup")}>
              <Upload className="h-4 w-4" /> Backup Data
            </Button>
          </div>
        </SectionCard>

        <SectionCard icon={Lock} title="Security">
          <ToggleRow
            label="App Lock (PIN)"
            description="Require a PIN before opening the app."
            checked={localSettings.appLock}
            onToggle={() => setLocalSettings((current) => ({ ...current, appLock: !current.appLock }))}
          />
          <ToggleRow
            label="Fingerprint Login"
            description="Use fingerprint or biometric unlock if supported."
            checked={localSettings.fingerprintLogin}
            onToggle={() => setLocalSettings((current) => ({ ...current, fingerprintLogin: !current.fingerprintLogin }))}
          />
        </SectionCard>

        <SectionCard icon={Languages} title="Language">
          <div className="flex flex-wrap gap-2">
            {languageOptions.map((option) => (
              <Button
                key={option}
                type="button"
                variant={localSettings.language === option ? "default" : "outline"}
                onClick={() => setLocalSettings((current) => ({ ...current, language: option }))}
              >
                {option}
              </Button>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={HelpCircle} title="Help & Support">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => toast.info("FAQ will open from the help center.")}>
              <ShieldQuestion className="h-4 w-4" /> FAQ
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => navigate("/support")}>
              <HelpCircle className="h-4 w-4" /> Contact Support
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => toast.info("Bug report form can be added next.")}>
              <FileText className="h-4 w-4" /> Report a Bug
            </Button>
          </div>
        </SectionCard>

        <SectionCard icon={Info} title="About">
          <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              <span>Inventra Version</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{INVENTRA_VERSION}</span>
            </div>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => navigate("/privacy-policy")}> 
              Privacy Policy
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={() => navigate("/terms")}>
              Terms & Conditions
            </Button>
          </div>
        </SectionCard>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Logout</h3>
            <p className="text-sm text-slate-500">Sign out of the current Inventra session.</p>
          </div>
          <Button type="button" variant="outline" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}