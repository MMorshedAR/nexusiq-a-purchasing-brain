import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { claimPendingInvite } from "@/lib/invites";

export type Company = Tables<"companies">;
export type Membership = { role: string; full_name: string | null; company: Company };

type Ctx = {
  memberships: Membership[];
  company: Company | null;
  role: string | null;
  canEdit: boolean;
  userEmail: string | null;
  userName: string | null;
  switchCompany: (id: string) => void;
  loading: boolean;
};
const WorkspaceCtx = createContext<Ctx | null>(null);
const KEY = "nexusiq.activeCompany";

async function ensurePendingCompany() {
  const { data: { user } } = await supabase.auth.getUser();
  const pending = user?.user_metadata?.["pending_company"] as
    | { name: string; slug: string; business_type: string; country: string; currency: string; budget: number | null; full_name: string }
    | undefined;
  if (!user) return;
  if (typeof user.user_metadata?.["pending_invite"] === "string") {
    await claimPendingInvite(user);
    return;
  }
  if (!pending) return;
  const { count } = await supabase.from("company_members").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) === 0) {
    await supabase.rpc("create_company", {
      _name: pending.name, _slug: pending.slug, _business_type: pending.business_type,
      _country: pending.country, _currency: pending.currency, _budget: pending.budget as number, _full_name: pending.full_name,
    });
  }
  await supabase.auth.updateUser({ data: { pending_company: null } });
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => { setActiveId(localStorage.getItem(KEY)); }, []);

  const q = useQuery({
    queryKey: ["memberships"],
    queryFn: async () => {
      await ensurePendingCompany();
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("company_members")
        .select("role, full_name, company:companies(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return {
        email: user?.email ?? null,
        name: (user?.user_metadata?.["full_name"] as string) ?? null,
        memberships: (data ?? []) as unknown as Membership[],
      };
    },
  });

  const memberships = q.data?.memberships ?? [];
  const current = memberships.find((m) => m.company.id === activeId) ?? memberships[0] ?? null;
  const value: Ctx = {
    memberships,
    company: current?.company ?? null,
    role: current?.role ?? null,
    canEdit: ["owner", "admin", "manager"].includes(current?.role ?? ""),
    userEmail: q.data?.email ?? null,
    userName: current?.full_name ?? q.data?.name ?? null,
    loading: q.isLoading,
    switchCompany: (id) => {
      localStorage.setItem(KEY, id);
      setActiveId(id);
      qc.invalidateQueries({ predicate: (x) => x.queryKey[0] !== "memberships" });
    },
  };
  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>;
}

export function useWorkspace() {
  const c = useContext(WorkspaceCtx);
  if (!c) throw new Error("useWorkspace outside provider");
  return c;
}
