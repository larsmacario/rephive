import { supabase } from "./supabase";

export type SupportCategory = "bug" | "question" | "feedback" | "account" | "other";

export interface SubmitSupportRequestInput {
  userId: string;
  category: SupportCategory;
  contactEmail: string;
  message: string;
}

export async function submitSupportRequest(input: SubmitSupportRequestInput): Promise<void> {
  const { error } = await supabase.from("support_requests").insert({
    user_id: input.userId,
    category: input.category,
    contact_email: input.contactEmail.trim(),
    message: input.message.trim(),
  });

  if (error) throw error;
}
