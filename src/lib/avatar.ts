import { supabase } from "./supabase";

const AVATAR_BUCKET = "avatars";
const AVATAR_FILENAME = "avatar.webp";

export function avatarStoragePath(userId: string): string {
  return `${userId}/${AVATAR_FILENAME}`;
}

export function getAvatarPublicUrl(path: string): string {
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatar(userId: string, blob: Blob): Promise<string> {
  const path = avatarStoragePath(userId);

  const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (removeError) {
    console.warn("Altes Profilbild konnte nicht entfernt werden:", removeError.message);
  }

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
    contentType: "image/webp",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
  if (profileError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    throw profileError;
  }

  return path;
}

export async function removeAvatar(userId: string): Promise<void> {
  const path = avatarStoragePath(userId);

  const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  if (removeError) throw removeError;

  const { error: profileError } = await supabase.from("profiles").update({ avatar_path: null }).eq("id", userId);
  if (profileError) throw profileError;
}
