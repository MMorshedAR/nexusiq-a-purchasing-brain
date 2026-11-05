import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { claimPendingInvite } from "@/lib/invites";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — NexusIQ" },
      { name: "description", content: "Sign in to your NexusIQ company workspace." },
      { property: "og:title", content: "Sign in — NexusIQ" },
      { property: "og:description", content: "Sign in to your NexusIQ company workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("If that email has an account, a reset link is on its way.");
        setMode("signin");
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      try { await claimPendingInvite(data.user); }
      catch (inviteError) { toast.error(inviteError instanceof Error ? inviteError.message : "Invitation could not be accepted."); }
      if (slug.trim()) {
        const { data: m } = await supabase
          .from("company_members").select("company_id, companies!inner(slug)")
          .eq("user_id", data.user.id).eq("companies.slug", slug.trim().toLowerCase()).maybeSingle();
        if (!m && !data.user.user_metadata?.["pending_company"]) {
          await supabase.auth.signOut();
          throw new Error("You are not a member of that workspace.");
        }
        if (m) localStorage.setItem("nexusiq.activeCompany", m.company_id);
      }
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) return void toast.error(r.error.message);
    if (r.redirected) return undefined;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try { await claimPendingInvite(user); }
      catch (inviteError) { toast.error(inviteError instanceof Error ? inviteError.message : "Invitation could not be accepted."); }
    }
    navigate({ to: "/app" });
  }

  return (
    <AuthLayout
      title={mode === "forgot" ? "Reset your password" : "Sign in to NexusIQ"}
      subtitle={mode === "forgot" ? "We'll email you a secure link." : "Enter your workspace and credentials."}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signin" && (
          <div className="space-y-1.5">
            <Label htmlFor="slug">Workspace slug <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="slug" placeholder="rahman-traders" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === "signin" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="pw">Password</Label>
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>
            </div>
            <div className="relative">
              <Input id="pw" type={show ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
        {mode === "signin" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox defaultChecked /> Keep me signed in on this device
          </label>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} {mode === "forgot" ? "Send reset link" : "Sign in"}
        </Button>
        {mode === "forgot" && (
          <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("signin")}>Back to sign in</Button>
        )}
      </form>
      {mode === "signin" && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to NexusIQ? <Link to="/register" className="font-medium text-primary hover:underline">Create a company account</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
