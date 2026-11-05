import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export async function claimPendingInvite(user: User) {
  const metadataToken = user.user_metadata["pending_invite"];
  const sessionToken = typeof window === "undefined" ? null : window.sessionStorage.getItem("nexusiq.pendingInvite");
  const token = typeof metadataToken === "string" ? metadataToken : sessionToken;
  if (!token) return false;

  const { data, error } = await supabase.rpc("claim_invite", { _token: token, _email: user.email ?? "" });
  if (error) throw error;
  const result = data as string;
  if (result !== "ok") {
    const message = result === "wrong_account" ? "This invitation was sent to a different email address." :
      result === "expired" ? "This invitation has expired." :
      result === "unauthenticated" ? "Sign in before accepting this invitation." : "This invitation is no longer available.";
    throw new Error(message);
  }

  if (typeof window !== "undefined") window.sessionStorage.removeItem("nexusiq.pendingInvite");
  if (typeof metadataToken === "string") {
    const { error: updateError } = await supabase.auth.updateUser({ data: { pending_invite: null } });
    if (updateError) throw updateError;
  }
  return true;
}