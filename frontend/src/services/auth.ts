import { getCurrentUser, supabase } from "../lib/supabase";

type RegisterPayload = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

type ProfileUpdatePayload = {
  username: string;
  first_name: string;
  last_name: string;
  mobile?: string;
  avatar_url?: string;
};

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // TEMP DEBUG — remove once the "Auth session missing" investigation is closed.
  console.log("[auth] signInWithPassword result", {
    hasSession: Boolean(data.session),
    hasUser: Boolean(data.user),
    userId: data.user?.id ?? null,
    expiresAt: data.session?.expires_at ?? null,
    error: error?.message ?? null,
  });

  if (error) {
    console.error("Supabase login failed", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    throw error;
  }

  if (!data.session) {
    throw new Error(
      "Sign-in succeeded but Supabase returned no session. This usually means email confirmation is required — check Supabase Auth settings."
    );
  }

  return data;
}

export async function register(payload: RegisterPayload) {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        username: payload.username,
        first_name: payload.first_name,
        last_name: payload.last_name,
      },
    },
  });

  if (error) {
    console.error("Supabase signup failed", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    throw error;
  }

  if (!data.session && data.user) {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });

    if (loginError) {
      console.error("Supabase post-signup login failed", {
        message: loginError.message,
        status: loginError.status,
        code: loginError.code,
      });
      throw loginError;
    }

    return loginData;
  }

  return data;
}

export async function fetchProfile() {
  const user = await getCurrentUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,username,first_name,last_name,email,mobile,avatar_url,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Supabase profile load failed", {
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
      code: profileError.code,
    });
  }

  return {
    id: user.id,
    username: profile?.username ?? user.user_metadata?.username ?? "",
    first_name: profile?.first_name ?? user.user_metadata?.first_name ?? "",
    last_name: profile?.last_name ?? user.user_metadata?.last_name ?? "",
    email: profile?.email ?? user.email ?? "",
    mobile: profile?.mobile ?? "",
    avatar_url: profile?.avatar_url ?? "",
    created_at: user.created_at ?? profile?.created_at ?? "",
    last_login_at: user.last_sign_in_at ?? "",
  };
}

export async function updateProfile(payload: ProfileUpdatePayload) {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      username: payload.username,
      first_name: payload.first_name,
      last_name: payload.last_name,
      mobile: payload.mobile ?? "",
      avatar_url: payload.avatar_url ?? "",
    })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: {
      username: payload.username,
      first_name: payload.first_name,
      last_name: payload.last_name,
      mobile: payload.mobile ?? "",
      avatar_url: payload.avatar_url ?? "",
    },
  });

  if (authUpdateError) {
    throw authUpdateError;
  }

  return data;
}

export async function uploadProfilePhoto(file: File) {
  const user = await getCurrentUser();

  const filePath = `${user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("profile-photos").upload(filePath, file, {
    upsert: true,
    contentType: file.type || "image/*",
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
  const avatarUrl = data.publicUrl;

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (profileUpdateError) {
    throw profileUpdateError;
  }

  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });

  if (authUpdateError) {
    throw authUpdateError;
  }

  return avatarUrl;
}

export async function changePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function changeEmail(email: string) {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

export async function updateMobileNumber(mobile: string) {
  const user = await getCurrentUser();

  const { error } = await supabase.from("profiles").update({ mobile }).eq("id", user.id);
  if (error) throw error;
}

export async function deleteAccountData() {
  const user = await getCurrentUser();

  const [{ error: settingsError }, { error: profileError }] = await Promise.all([
    supabase.from("app_settings").delete().eq("user_id", user.id),
    supabase.from("profiles").delete().eq("id", user.id),
  ]);

  if (settingsError) throw settingsError;
  if (profileError) throw profileError;

  await supabase.auth.signOut();
}
