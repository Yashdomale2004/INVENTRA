import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Fingerprint, Globe, KeyRound, Mail, MoonStar, Phone, Save, SunMedium, Trash2, Upload, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { changeEmail, changePassword, deleteAccountData, updateMobileNumber, updateProfile, uploadProfilePhoto } from "../services/auth";

type ProfileFormValues = {
  username: string;
  first_name: string;
  last_name: string;
  mobile: string;
  avatar_url: string;
};

const profileSchema = z.object({
  username: z.string().min(1, "Username is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  mobile: z.string().optional(),
  avatar_url: z.string().optional(),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm the password"),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const mobileSchema = z.object({
  mobile: z.string().min(8, "Enter a valid mobile number"),
});

const languages = ["English", "Hindi", "Marathi"];

function SectionCard({ title, icon: Icon, description, children }: { title: string; icon: typeof UserRound; description: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

export function ProfilePage() {
  const { user, logout, loadProfile } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  const [notificationPreferences, setNotificationPreferences] = useState({
    enabled: true,
    lowStockAlert: true,
    sound: true,
  });
  const [language, setLanguage] = useState("English");

  const avatarFallback = useMemo(() => {
    const name = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();
    return name ? name.slice(0, 2).toUpperCase() : (user?.username ?? "IN").slice(0, 2).toUpperCase();
  }, [user?.first_name, user?.last_name, user?.username]);

  useEffect(() => {
    return () => {
      if (selectedPhotoPreview) {
        URL.revokeObjectURL(selectedPhotoPreview);
      }
    };
  }, [selectedPhotoPreview]);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileFormValues>,
    defaultValues: {
      username: user?.username ?? "",
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      mobile: (user as any)?.mobile ?? "",
      avatar_url: (user as any)?.avatar_url ?? "",
    },
  });

  const passwordForm = useForm<{ password: string; confirm_password: string }>({
    resolver: zodResolver(passwordSchema) as Resolver<{ password: string; confirm_password: string }>,
    defaultValues: { password: "", confirm_password: "" },
  });

  const emailForm = useForm<{ email: string }>({
    resolver: zodResolver(emailSchema) as Resolver<{ email: string }>,
    defaultValues: { email: user?.email ?? "" },
  });

  const mobileForm = useForm<{ mobile: string }>({
    resolver: zodResolver(mobileSchema) as Resolver<{ mobile: string }>,
    defaultValues: { mobile: (user as any)?.mobile ?? "" },
  });

  useEffect(() => {
    profileForm.reset({
      username: user?.username ?? "",
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      mobile: (user as any)?.mobile ?? "",
      avatar_url: (user as any)?.avatar_url ?? "",
    });
    emailForm.reset({ email: user?.email ?? "" });
    mobileForm.reset({ mobile: (user as any)?.mobile ?? "" });
  }, [emailForm, mobileForm, profileForm, user]);

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (selectedPhoto) {
        const avatarUrl = await uploadProfilePhoto(selectedPhoto);
        return updateProfile({ ...values, avatar_url: avatarUrl });
      }

      return updateProfile(values);
    },
    onSuccess: async () => {
      toast.success("Profile updated.");
      setSelectedPhoto(null);
      if (selectedPhotoPreview) {
        URL.revokeObjectURL(selectedPhotoPreview);
        setSelectedPhotoPreview(null);
      }
      await loadProfile();
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: () => toast.error("Could not update profile."),
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success("Password changed.");
      passwordForm.reset({ password: "", confirm_password: "" });
    },
    onError: () => toast.error("Could not change password."),
  });

  const emailMutation = useMutation({
    mutationFn: changeEmail,
    onSuccess: async () => {
      toast.success("Email update requested. Check your inbox if confirmation is required.");
      await loadProfile();
    },
    onError: () => toast.error("Could not change email address."),
  });

  const mobileMutation = useMutation({
    mutationFn: updateMobileNumber,
    onSuccess: async () => {
      toast.success("Mobile number updated.");
      await loadProfile();
    },
    onError: () => toast.error("Could not change mobile number."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccountData,
    onSuccess: async () => {
      toast.success("Account data deleted and session closed.");
      await queryClient.invalidateQueries();
    },
    onError: () => toast.error("Could not delete account data."),
  });

  const applyTheme = (mode: "light" | "dark") => setTheme(mode);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Profile</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your Inventra account and preferences.</p>
      </div>

      <Card className="overflow-hidden border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-200 text-xl font-black text-slate-800 dark:bg-slate-800 dark:text-slate-100">
              {selectedPhotoPreview || user?.avatar_url ? (
                <img src={selectedPhotoPreview ?? user?.avatar_url ?? ""} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span aria-label="Default avatar">{avatarFallback}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Account</p>
              <h3 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">{user?.first_name} {user?.last_name}</h3>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-2xl px-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Change Photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (!file) return;
                if (selectedPhotoPreview) {
                  URL.revokeObjectURL(selectedPhotoPreview);
                }
                setSelectedPhoto(file);
                setSelectedPhotoPreview(URL.createObjectURL(file));
              }}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Edit Profile" icon={UserRound} description="Update your name, profile photo, and mobile number.">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">First Name</label>
              <Input className="h-11 rounded-xl" {...profileForm.register("first_name")} placeholder="First name" />
              {profileForm.formState.errors.first_name && <p className="mt-1 text-xs text-rose-500">{profileForm.formState.errors.first_name.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Last Name</label>
              <Input className="h-11 rounded-xl" {...profileForm.register("last_name")} placeholder="Last name" />
              {profileForm.formState.errors.last_name && <p className="mt-1 text-xs text-rose-500">{profileForm.formState.errors.last_name.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Username</label>
              <Input className="h-11 rounded-xl" {...profileForm.register("username")} />
              {profileForm.formState.errors.username && <p className="mt-1 text-xs text-rose-500">{profileForm.formState.errors.username.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400"><Phone className="h-3.5 w-3.5" /> Mobile Number</label>
              <Input className="h-11 rounded-xl" {...profileForm.register("mobile")} placeholder="+91..." />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" className="h-11 rounded-xl px-5" disabled={profileMutation.isPending}>
                <Save className="mr-2 h-4 w-4" /> Save Profile
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Change Password" icon={KeyRound} description="Change your login password securely.">
          <form className="grid gap-3" onSubmit={passwordForm.handleSubmit((values) => passwordMutation.mutate(values.password))}>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">New Password</label>
              <Input className="h-11 rounded-xl" type="password" {...passwordForm.register("password")} />
              {passwordForm.formState.errors.password && <p className="mt-1 text-xs text-rose-500">{passwordForm.formState.errors.password.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Confirm Password</label>
              <Input className="h-11 rounded-xl" type="password" {...passwordForm.register("confirm_password")} />
              {passwordForm.formState.errors.confirm_password && <p className="mt-1 text-xs text-rose-500">{passwordForm.formState.errors.confirm_password.message}</p>}
            </div>
            <Button type="submit" className="h-11 rounded-xl" disabled={passwordMutation.isPending}>
              <KeyRound className="mr-2 h-4 w-4" /> Change Password
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="Change Email Address" icon={Mail} description="Update your account email address.">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={emailForm.handleSubmit((values) => emailMutation.mutate(values.email))}>
            <Input className="h-11 flex-1 rounded-xl" {...emailForm.register("email")} />
            <Button type="submit" className="h-11 rounded-xl" disabled={emailMutation.isPending}>
              <Mail className="mr-2 h-4 w-4" /> Update
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="Change Mobile Number" icon={Phone} description="Keep your contact number up to date.">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={mobileForm.handleSubmit((values) => mobileMutation.mutate(values.mobile))}>
            <Input className="h-11 flex-1 rounded-xl" {...mobileForm.register("mobile")} />
            <Button type="submit" className="h-11 rounded-xl" disabled={mobileMutation.isPending}>
              <Phone className="mr-2 h-4 w-4" /> Save
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="Notification Preferences" icon={Bell} description="Control how Inventra alerts you.">
          <ToggleOption label="Enable Notifications" checked={notificationPreferences.enabled} onClick={() => setNotificationPreferences((current) => ({ ...current, enabled: !current.enabled }))} />
          <ToggleOption label="Low Stock Alert" checked={notificationPreferences.lowStockAlert} onClick={() => setNotificationPreferences((current) => ({ ...current, lowStockAlert: !current.lowStockAlert }))} />
          <ToggleOption label="Notification Sound" checked={notificationPreferences.sound} onClick={() => setNotificationPreferences((current) => ({ ...current, sound: !current.sound }))} />
        </SectionCard>

        <SectionCard title="Language" icon={Globe} description="Choose the language you prefer to use in Inventra.">
          <div className="flex flex-wrap gap-2">
            {languages.map((item) => (
              <Button key={item} type="button" variant={language === item ? "default" : "outline"} className="h-10 rounded-xl" onClick={() => setLanguage(item)}>
                {item}
              </Button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Security" icon={Fingerprint} description="Extra protection for your account and app access.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant={resolvedTheme === "light" ? "outline" : "default"} className="h-11 rounded-xl" onClick={() => applyTheme("light")}>
              <SunMedium className="mr-2 h-4 w-4" /> Light Mode
            </Button>
            <Button type="button" variant={resolvedTheme === "dark" ? "outline" : "default"} className="h-11 rounded-xl" onClick={() => applyTheme("dark")}>
              <MoonStar className="mr-2 h-4 w-4" /> Dark Mode
            </Button>
          </div>
          <Button type="button" variant="outline" className="h-11 w-full justify-start gap-2 rounded-xl">
            <Fingerprint className="h-4 w-4" /> Fingerprint Login
          </Button>
        </SectionCard>

        <SectionCard title="Delete Account" icon={Trash2} description="Remove your profile and app settings from Inventra, then sign out.">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-start gap-2 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"
            onClick={() => {
              if (window.confirm("Delete your Inventra profile data and sign out?")) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete Account
          </Button>
        </SectionCard>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Logout</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sign out of your current Inventra session.</p>
          </div>
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={logout}>
            <Upload className="mr-2 h-4 w-4 rotate-180" /> Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ToggleOption({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" className="h-11 w-full justify-between rounded-xl" onClick={onClick}>
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${checked ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
        {checked ? "On" : "Off"}
      </span>
    </Button>
  );
}