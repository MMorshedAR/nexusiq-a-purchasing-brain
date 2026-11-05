import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand";
import { AuthLayout } from "@/components/auth-layout";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [
    { title: "Workspace invitation — NexusIQ" }, { name: "description", content: "Accept an invitation to join a NexusIQ workspace." },
    { property: "og:title", content: "Workspace invitation — NexusIQ" }, { property: "og:description", content: "Join a company workspace on NexusIQ." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: InvitePage,
});

const roleNames: Record<Enums<"company_role">, string> = { owner: "Owner", admin: "Admin", manager: "Manager", analyst: "Analyst", viewer: "Viewer" };

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const validToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
  const query = useQuery({
    queryKey: ["invite-preview", token], enabled: validToken, retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("invite_preview", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  function continueTo(path: "/auth" | "/register") {
    window.sessionStorage.setItem("nexusiq.pendingInvite", token);
    void navigate({ to: path });
  }
  return <AuthLayout title="Workspace invitation" subtitle="Join your team on NexusIQ.">
    {!validToken || query.isError || (query.isSuccess && !query.data) ? <div className="rounded-md border bg-card p-5 text-sm"><MailCheck className="mb-3 h-6 w-6 text-muted-foreground" /><p className="font-medium">This invitation is unavailable.</p><p className="mt-1 text-muted-foreground">It may have been cancelled or expired. Ask the workspace administrator for a new link.</p></div> : !query.data ? <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Checking invitation…</div> : <div className="space-y-4 rounded-md border bg-card p-5">
      <div><p className="text-sm text-muted-foreground">You’re invited to</p><h1 className="mt-1 font-display text-xl font-semibold">{query.data.company_name}</h1></div>
      <div className="border-y py-3 text-sm"><p><span className="text-muted-foreground">Email</span><span className="ml-2 font-medium">{query.data.invited_email}</span></p><p className="mt-2"><span className="text-muted-foreground">Role</span><span className="ml-2 font-medium">{roleNames[query.data.invited_role]}</span></p></div>
      <Button className="w-full" onClick={() => continueTo("/auth")}>Sign in to accept <ArrowRight /></Button>
      <Button className="w-full" variant="outline" onClick={() => continueTo("/register")}>Create an account</Button>
      <p className="text-xs text-muted-foreground">Sign in using the email address this invitation was sent to.</p>
    </div>}
    <div className="mt-6 text-center"><Logo className="justify-center text-sm" /></div>
  </AuthLayout>;
}