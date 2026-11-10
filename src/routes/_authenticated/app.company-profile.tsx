import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, ImagePlus, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/lib/workspace";
import { canManageWorkspaceSettings } from "@/lib/permissions";
import { formatBDT } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/company-profile")({
  head: () => ({ meta: [
    { title: "Company Profile — NexusIQ" }, { name: "description", content: "Manage your company identity and contact details." },
    { property: "og:title", content: "Company Profile — NexusIQ" }, { property: "og:description", content: "Company identity, contact and legal details." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CompanyProfile,
});

function CompanyProfile() {
  const { company, role, userName } = useWorkspace();
  const editable = canManageWorkspaceSettings(role);
  const client = useQueryClient();
  const [form, setForm] = useState({ name: "", business_type: "", company_email: "", phone: "", address: "", city: "", country: "", website: "", tax_id: "", registration_number: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const logo = useQuery({
    queryKey: ["company-logo", company?.id, company?.logo_path], enabled: !!company?.logo_path,
    queryFn: async () => {
      if (!company?.logo_path) return null;
      const { data, error } = await supabase.storage.from("company-logos").createSignedUrl(company.logo_path, 1800);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  useEffect(() => {
    if (!company) return;
    setForm({ name: company.name, business_type: company.business_type ?? "", company_email: company.company_email ?? "", phone: company.phone ?? "", address: company.address ?? "", city: company.city ?? "", country: company.country, website: company.website ?? "", tax_id: company.tax_id ?? "", registration_number: company.registration_number ?? "" });
  }, [company]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company || !editable || busy) return;
    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      let logoPath = company.logo_path;
      if (logoFile) {
        if (!logoFile.type.startsWith("image/") || logoFile.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
        const extension = logoFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
        uploadedPath = `${company.id}/logo-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("company-logos").upload(uploadedPath, logoFile, { upsert: false, contentType: logoFile.type });
        if (uploadError) throw uploadError;
        logoPath = uploadedPath;
      }
      const { error } = await supabase.from("companies").update({ ...form, business_type: form.business_type || null, company_email: form.company_email || null, phone: form.phone || null, address: form.address || null, city: form.city || null, website: form.website || null, tax_id: form.tax_id || null, registration_number: form.registration_number || null, logo_path: logoPath }).eq("id", company.id).select("id").single();
      if (error) throw error;
      if (uploadedPath && company.logo_path) await supabase.storage.from("company-logos").remove([company.logo_path]);
      setLogoFile(null);
      await client.invalidateQueries({ queryKey: ["memberships"] });
      await client.invalidateQueries({ queryKey: ["company-logo", company.id] });
      toast.success("Company profile saved.");
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("company-logos").remove([uploadedPath]);
      toast.error(error instanceof Error ? error.message : "Company profile could not be saved.");
    } finally { setBusy(false); }
  }

  if (!company) return null;
  return <>
    <PageHeader title="Company Profile" description="Company identity, contacts and registration details." />
    <section className="mb-6 flex flex-wrap items-center gap-4 border-y py-5">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
        {logo.data ? <img src={logo.data} alt={`${company.name} logo`} className="size-full object-contain" /> : <Building2 className="size-7 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1"><p className="font-display text-lg font-semibold">{company.name}</p><p className="text-sm text-muted-foreground">Workspace {company.id.slice(0, 8).toUpperCase()} · Created {new Date(company.created_at).toLocaleDateString()}</p><p className="mt-1 text-xs text-muted-foreground">Owner {userName ?? "Workspace owner"} · {formatBDT(company.monthly_budget ?? 0, company.currency)} monthly budget</p></div>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><ImagePlus className="size-4" />{logoFile ? logoFile.name : "Choose logo"}<input type="file" accept="image/*" className="sr-only" disabled={!editable} onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} /></label>
    </section>
    <form onSubmit={save} className="max-w-3xl">
      <div className="grid gap-x-5 gap-y-4 border-b py-5 sm:grid-cols-2">
        <Field label="Company name" value={form.name} onChange={(name) => setForm((old) => ({ ...old, name }))} required disabled={!editable} />
        <Field label="Business category" value={form.business_type} onChange={(business_type) => setForm((old) => ({ ...old, business_type }))} disabled={!editable} />
        <Field label="Company email" type="email" value={form.company_email} onChange={(company_email) => setForm((old) => ({ ...old, company_email }))} disabled={!editable} />
        <Field label="Phone" value={form.phone} onChange={(phone) => setForm((old) => ({ ...old, phone }))} disabled={!editable} />
        <Field label="City" value={form.city} onChange={(city) => setForm((old) => ({ ...old, city }))} disabled={!editable} />
        <Field label="Country" value={form.country} onChange={(country) => setForm((old) => ({ ...old, country }))} required disabled={!editable} />
        <Field label="Website" type="url" value={form.website} onChange={(website) => setForm((old) => ({ ...old, website }))} disabled={!editable} />
        <Field label="Tax / VAT ID" value={form.tax_id} onChange={(tax_id) => setForm((old) => ({ ...old, tax_id }))} disabled={!editable} />
        <Field label="Business registration number" value={form.registration_number} onChange={(registration_number) => setForm((old) => ({ ...old, registration_number }))} disabled={!editable} />
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="company-address">Business address</Label><Textarea id="company-address" value={form.address} disabled={!editable} onChange={(event) => setForm((old) => ({ ...old, address: event.target.value }))} /></div>
      </div>
      {!editable && <p className="py-4 text-sm text-muted-foreground">Only company Owners and Admins can edit this profile.</p>}
      {editable && <Button className="mt-4" disabled={busy}><Save />{busy ? "Saving…" : "Save profile"}</Button>}
    </form>
  </>;
}

function Field({ label, value, onChange, type = "text", required, disabled }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; disabled?: boolean }) {
  const id = `company-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} required={required} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></div>;
}