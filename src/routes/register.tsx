import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { slugify } from "@/lib/format";
import { claimPendingInvite } from "@/lib/invites";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your company workspace — NexusIQ" },
      { name: "description", content: "Register your business on NexusIQ and start making smarter purchasing decisions." },
      { property: "og:title", content: "Create your company workspace — NexusIQ" },
      { property: "og:description", content: "Register your business on NexusIQ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Register,
});

const businessTypes = ["Wholesaler", "Importer", "Distributor", "Retailer", "Manufacturer"];

function Register() {
  const navigate = useNavigate();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [f, setF] = useState({ company: "", slug: "", name: "", email: "", password: "", confirm: "", type: "Wholesaler", country: "Bangladesh", currency: "BDT", budget: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => { setInviteToken(window.sessionStorage.getItem("nexusiq.pendingInvite")); }, []);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v, ...(k === "company" && !slugTouched ? { slug: slugify(v) } : {}) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password.length < 8) return void toast.error("Password must be at least 8 characters.");
    if (f.password !== f.confirm) return void toast.error("Passwords do not match.");
    if (!inviteToken && !/^[a-z0-9][a-z0-9-]{2,39}$/.test(f.slug)) return void toast.error("Slug: 3–40 lowercase letters, numbers or dashes.");
    setBusy(true);
    try {
      if (!inviteToken) {
        const { data: free, error: slugError } = await supabase.rpc("slug_available", { _slug: f.slug });
        if (slugError) throw slugError;
        if (!free) throw new Error("That workspace slug is already taken.");
      }
      const pending = { name: f.company, slug: f.slug, business_type: f.type, country: f.country, currency: f.currency, budget: f.budget ? Number(f.budget) : null, full_name: f.name };
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.password,
        options: { emailRedirectTo: window.location.origin + "/app", data: { full_name: f.name, ...(inviteToken ? { pending_invite: inviteToken } : { pending_company: pending }) } },
      });
      if (error) throw error;
      if (data.session) {
        if (data.user) await claimPendingInvite(data.user);
        navigate({ to: "/app" });
      }
      else setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${f.email}.`}>
        <div className="rounded-lg border bg-card p-6 text-sm">
          <MailCheck className="mb-3 h-6 w-6 text-primary" />
          {inviteToken ? <>Click the link to confirm your account, then sign in using the invited email to join the workspace.</> : <>Click the link to confirm your account. Your <b>{f.company}</b> workspace will be created the first time you sign in.</>}
          <Button asChild className="mt-6 w-full"><Link to="/auth">Go to sign in</Link></Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={inviteToken ? "Join a workspace" : "Create your company workspace"} subtitle={inviteToken ? "Create an account with the invited email address." : "You'll be the Owner. Invite your team later."}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        {!inviteToken && <>
        <Field className="col-span-2" label="Company name"><Input required value={f.company} onChange={(e) => set("company", e.target.value)} /></Field>
        <Field className="col-span-2" label="Workspace slug">
          <Input required value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
        </Field>
        <Field className="col-span-2" label="Your name"><Input required value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field className="col-span-2" label="Email"><Input type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Password"><Input type="password" required value={f.password} onChange={(e) => set("password", e.target.value)} /></Field>
        <Field label="Confirm password"><Input type="password" required value={f.confirm} onChange={(e) => set("confirm", e.target.value)} /></Field>
        <Field label="Business type">
          <Select value={f.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{businessTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Country"><Input value={f.country} onChange={(e) => set("country", e.target.value)} /></Field>
        <Field label="Currency">
          <Select value={f.currency} onValueChange={(v) => set("currency", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="BDT">BDT (৳)</SelectItem><SelectItem value="USD">USD ($)</SelectItem></SelectContent>
          </Select>
        </Field>
        <Field label="Monthly budget (optional)"><Input type="number" min="0" placeholder="500000" value={f.budget} onChange={(e) => set("budget", e.target.value)} /></Field>
        </>}
        {inviteToken && <p className="col-span-2 text-sm text-muted-foreground">Your invitation will be checked after account confirmation. Use the exact email address it was sent to.</p>}
        <Button type="submit" className="col-span-2" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Create workspace</Button>
        <p className="col-span-2 text-center text-sm text-muted-foreground">Already registered? <Link to="/auth" className="font-medium text-primary hover:underline">Sign in</Link></p>
      </form>
    </AuthLayout>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={"space-y-1.5 " + className}><Label>{label}</Label>{children}</div>;
}
