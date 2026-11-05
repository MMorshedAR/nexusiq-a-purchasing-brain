import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace";
import { canManageWorkspaceSettings } from "@/lib/permissions";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [
    { title: "Company Settings — NexusIQ" }, { name: "description", content: "Manage company workspace information and language preferences." },
    { property: "og:title", content: "Company Settings — NexusIQ" }, { property: "og:description", content: "Manage company workspace information." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Settings,
});

function Settings() {
  const { company, role } = useWorkspace();
  const canEdit = canManageWorkspaceSettings(role);
  const { language, setLanguage, t } = useLanguage();
  const queryClient = useQueryClient();
  const [name, setName] = useState(company?.name ?? "");
  const [country, setCountry] = useState(company?.country ?? "");
  const [currency, setCurrency] = useState(company?.currency ?? "BDT");
  const [budget, setBudget] = useState(company?.monthly_budget?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(company?.name ?? ""); setCountry(company?.country ?? "");
    setCurrency(company?.currency ?? "BDT"); setBudget(company?.monthly_budget?.toString() ?? "");
  }, [company?.id, company?.name, company?.country, company?.currency, company?.monthly_budget]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!company || !canEdit) return;
    const monthlyBudget = budget.trim() ? Number(budget) : null;
    if (monthlyBudget !== null && (!Number.isFinite(monthlyBudget) || monthlyBudget < 0)) return void toast.error("Enter a valid non-negative monthly budget.");
    setBusy(true);
    try {
      const { error } = await supabase.from("companies").update({ name: name.trim(), country: country.trim(), currency, monthly_budget: monthlyBudget }).eq("id", company.id).select("id").single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
      await queryClient.invalidateQueries();
      toast.success("Workspace settings saved.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Settings could not be saved."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader title={t("Company Settings")} description="Workspace details and personal language preferences." />
    <form onSubmit={save} className="max-w-2xl">
      <div className="flex items-center gap-3 border-y py-4"><Settings2 className="h-5 w-5 text-primary" /><div><h2 className="font-medium">{t("Company workspace")}</h2><p className="text-sm text-muted-foreground">{t("Only Owners and Admins can update these details.")}</p></div></div>
      <div className="grid gap-x-5 gap-y-4 border-b py-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="company-name">{t("Company name")}</Label><Input id="company-name" required value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} /></div>
        <div className="space-y-2"><Label htmlFor="country">{t("Country")}</Label><Input id="country" required value={country} onChange={(e) => setCountry(e.target.value)} disabled={!canEdit} /></div>
        <div className="space-y-2"><Label>{t("Currency")}</Label><Select value={currency} onValueChange={setCurrency} disabled={!canEdit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BDT">BDT (৳)</SelectItem><SelectItem value="USD">USD ($)</SelectItem></SelectContent></Select></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="monthly-budget">{t("Monthly budget")} ({currency})</Label><Input id="monthly-budget" type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} disabled={!canEdit} placeholder="Optional" /></div>
      </div>
      {canEdit && <Button className="mt-4" disabled={busy}><Save />{busy ? "Saving…" : t("Save changes")}</Button>}
    </form>
    <section className="mt-9 max-w-2xl">
      <div className="border-y py-4"><h2 className="font-medium">{t("Profile & preferences")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("Choose the language shown in the app.")}</p></div>
      <div className="flex flex-wrap items-center justify-between gap-4 py-5"><Label>{t("Language")}</Label><Select value={language} onValueChange={(value) => setLanguage(value as "en" | "bn")}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="bn">বাংলা</SelectItem></SelectContent></Select></div>
    </section>
  </>;
}