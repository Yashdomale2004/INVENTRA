import { getCurrentUser, supabase } from "../lib/supabase";

export type AppSetting = {
  id: string;
  user_id: string;
  business_name: string;
  company_logo: string | null;
  gst_number: string;
  dark_mode: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchAppSettings() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return [];
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as AppSetting[];
}

export async function saveAppSetting(payload: Partial<AppSetting>) {
  const user = await getCurrentUser();

  const { data: existingList, error: fetchError } = await supabase
    .from("app_settings")
    .select("*")
    .eq("user_id", user.id)
    .limit(1);

  if (fetchError) {
    throw fetchError;
  }

  const existing = existingList?.[0];

  if (existing) {
    const { data, error } = await supabase
      .from("app_settings")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as AppSetting;
  }

  const { data, error } = await supabase
    .from("app_settings")
    .insert({
      user_id: user.id,
      business_name: payload.business_name ?? "INVENTRA",
      gst_number: payload.gst_number ?? "",
      dark_mode: payload.dark_mode ?? false,
      company_logo: payload.company_logo ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as AppSetting;
}
