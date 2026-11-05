import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, MailPlus, ShieldCheck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { useWorkspace } from "@/lib/workspace";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({ meta: [
    { title: "Team & Permissions — NexusIQ" }, { name: "description", content: "Manage workspace members, roles and invitations." },
    { property: "og:title", content: "Team & Permissions — NexusIQ" }, { property: "og:description", content: "Manage workspace members and invitations." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Team,
});

type Role = Enums<"company_role">;
type Member = Pick<Tables<"company_members">, "id" | "user_id" | "full_name" | "role" | "created_at">;
type Invite = Pick<Tables<"team_invites">, "id" | "email" | "role" | "token" | "status" | "created_at" | "expires_at">;
const roles: Role[] = ["admin", "manager", "analyst", "viewer"];
const roleNames: Record<Role, string> = { owner: "Owner", admin: "Admin", manager: "Manager", analyst: "Analyst", viewer: "Viewer" };

function Team() {
  const { company, role } = useWorkspace();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const isOwner = role === "owner";
  const canManage = isOwner || role === "admin";
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [busy, setBusy] = useState(false);
  const membersQuery = useQuery({
    queryKey: ["team-members", company?.id], enabled: !!company,
    queryFn: async () => {
      if (!company) throw new Error("No workspace is selected.");
      const { data, error } = await supabase.from("company_members").select("id,user_id,full_name,role,created_at").eq("company_id", company.id).order("created_at");
      if (error) throw error;
      return data as Member[];
    },
  });
  const invitesQuery = useQuery({
    queryKey: ["team-invites", company?.id], enabled: !!company && canManage,
    queryFn: async () => {
      if (!company) throw new Error("No workspace is selected.");
      const { data, error } = await supabase.from("team_invites").select("id,email,role,token,status,created_at,expires_at").eq("company_id", company.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invite[];
    },
  });
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["team-members", company?.id] });
    await queryClient.invalidateQueries({ queryKey: ["team-invites", company?.id] });
  }
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!company || !canManage || busy) return;
    setBusy(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sign in before inviting a teammate.");
      if (inviteRole === "owner" && !isOwner) throw new Error("Only a workspace Owner can invite another Owner.");
      const { data, error } = await supabase.from("team_invites").insert({ company_id: company.id, email: email.trim().toLowerCase(), role: inviteRole, invited_by: authData.user.id }).select("token").single();
      if (error) throw error;
      const link = `${window.location.origin}/invite/${data.token}`;
      try { await navigator.clipboard.writeText(link); toast.success(t("Invitation created and link copied.")); }
      catch { toast.success(`Invitation link: ${link}`); }
      setEmail("");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Invitation could not be created."); }
    finally { setBusy(false); }
  }
  async function copyInvite(inviteRow: Invite) {
    const link = `${window.location.origin}/invite/${inviteRow.token}`;
    try { await navigator.clipboard.writeText(link); toast.success("Invitation link copied."); }
    catch { toast.error(`Copy this invitation link: ${link}`); }
  }
  async function changeRole(member: Member, nextRole: Role) {
    if (!company || !canManage || (member.role === "owner" && !isOwner)) return;
    try {
      const { error } = await supabase.from("company_members").update({ role: nextRole }).eq("id", member.id).eq("company_id", company.id);
      if (error) throw error;
      toast.success(t("Team role updated."));
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Role could not be updated."); }
  }
  async function cancelInvite(inviteRow: Invite) {
    if (!company || !canManage) return;
    try {
      const { error } = await supabase.from("team_invites").update({ status: "revoked" }).eq("id", inviteRow.id).eq("company_id", company.id);
      if (error) throw error;
      toast.success(t("Invitation cancelled."));
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Invitation could not be cancelled."); }
  }

  const pendingInvites = (invitesQuery.data ?? []).filter((item) => item.status === "pending" && new Date(item.expires_at).getTime() > Date.now());
  return <>
    <PageHeader title={t("Team & Permissions")} description={t("Manage who can access this company workspace.")} />
    <section>
      <div className="flex items-center justify-between gap-4 border-y py-4"><div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-primary" /><h2 className="font-medium">{t("Team members")}</h2></div><Badge variant="outline">{membersQuery.data?.length ?? 0} {t("members")}</Badge></div>
      {membersQuery.isError && <p className="py-5 text-sm text-destructive">{t("Team members could not be loaded.")}</p>}
      <div className="divide-y">{(membersQuery.data ?? []).map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-medium">{(member.full_name ?? "?").slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-medium">{member.full_name || "Workspace member"}</p><p className="text-xs text-muted-foreground">Joined {new Date(member.created_at).toLocaleDateString()}</p></div></div>
        {canManage && (member.role !== "owner" || isOwner) ? <Select value={member.role} onValueChange={(value) => void changeRole(member, value as Role)}><SelectTrigger className="w-36" aria-label={`${t("Role for")} ${member.full_name ?? t("member")}`}><SelectValue /></SelectTrigger><SelectContent>{[...roles, ...(isOwner ? ["owner" as Role] : [])].map((item) => <SelectItem key={item} value={item}>{t(roleNames[item])}</SelectItem>)}</SelectContent></Select> : <Badge variant={member.role === "owner" ? "default" : "secondary"}>{member.role === "owner" && <ShieldCheck className="mr-1 h-3 w-3" />}{t(roleNames[member.role])}</Badge>}
      </div>)}</div>
      {membersQuery.isSuccess && !membersQuery.data.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("No team members found.")}</p>}
    </section>

    {canManage ? <>
      <section className="mt-8">
        <div className="flex items-center gap-3 border-y py-4"><MailPlus className="h-5 w-5 text-primary" /><div><h2 className="font-medium">{t("Invite a teammate")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("Create a secure link to share with the invited email address.")}</p></div></div>
        <form onSubmit={invite} className="grid gap-3 border-b py-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
          <div className="space-y-2"><Label htmlFor="invite-email">{t("Email address")}</Label><Input id="invite-email" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" /></div>
          <div className="space-y-2"><Label>{t("Workspace role")}</Label><Select value={inviteRole} onValueChange={(value) => setInviteRole(value as Role)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[...roles, ...(isOwner ? ["owner" as Role] : [])].map((item) => <SelectItem key={item} value={item}>{t(roleNames[item])}</SelectItem>)}</SelectContent></Select></div>
          <Button disabled={busy || !email.trim()}><MailPlus />{busy ? t("Creating…") : t("Create invite")}</Button>
        </form>
      </section>
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4 border-y py-4"><h2 className="font-medium">{t("Pending invitations")}</h2><Badge variant="outline">{pendingInvites.length} {t("pending")}</Badge></div>
        {invitesQuery.isError && <p className="py-5 text-sm text-destructive">{t("Invitations could not be loaded.")}</p>}
        <div className="divide-y">{pendingInvites.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate font-medium">{item.email}</p><p className="text-xs text-muted-foreground">{roleNames[item.role]} · expires {new Date(item.expires_at).toLocaleDateString()}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void copyInvite(item)}><Copy /> Copy link</Button><Button variant="ghost" size="icon" aria-label={`Cancel invitation for ${item.email}`} title="Cancel invitation" onClick={() => void cancelInvite(item)}><X /></Button></div></div>)}</div>
        {invitesQuery.isSuccess && !pendingInvites.length && <p className="py-6 text-sm text-muted-foreground">{t("No active invitations.")}</p>}
      </section>
    </> : <p className="mt-6 border-y py-4 text-sm text-muted-foreground">{t("Only workspace Owners and Admins can create invitations or change member roles.")}</p>}
  </>;
}