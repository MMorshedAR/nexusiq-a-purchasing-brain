import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { autoMap, importDefs, validateRows, type ImportKind } from "@/lib/importer";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/import")({
  head: () => ({ meta: [{ title: "Data Import Center — NexusIQ" }, { name: "description", content: "Import products, suppliers, stock and sales from CSV or Excel." }, { property: "og:title", content: "Data Import Center — NexusIQ" }, { property: "og:description", content: "Import from CSV or Excel." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ImportCenter,
});

const templates: Record<ImportKind, string> = {
  products: "SKU,Name,Category,Unit,Cost,Price,Supplier,Lead time,Reorder point\nRICE-25,Miniket Rice 25kg,Grocery,bag,1650,1850,Rahman Traders,7,40",
  suppliers: "Name,Contact,Phone,Email,Country,Lead time,Terms\nRahman Traders,Karim Rahman,01711000000,karim@example.com,Bangladesh,7,Net 30",
  inventory: "SKU,Quantity,Warehouse\nRICE-25,120,Main Warehouse",
  sales: "Date,SKU,Quantity\n2026-10-01,RICE-25,14",
};

function ImportCenter() {
  const { company, canEdit } = useWorkspace();
  const qc = useQueryClient();
  const [kind, setKind] = useState<ImportKind>("products");
  const [file, setFile] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [raw, setRaw] = useState<Record<string, unknown>[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const def = importDefs[kind];
  const validated = useMemo(() => validateRows(raw, def.fields, map), [raw, def, map]);
  const bad = validated.filter((v) => v.errors.length);
  const good = validated.filter((v) => !v.errors.length);

  function reset(k: ImportKind) { setKind(k); setFile(null); setRaw([]); setHeaders([]); setMap({}); setResult(null); }

  async function onFile(f: File) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]!]!, { defval: "" });
    if (!rows.length) return void toast.error("That file has no data rows.");
    if (rows.length > 20000) return void toast.error("Please split files over 20,000 rows.");
    const h = Object.keys(rows[0]!);
    setFile(f.name); setRaw(rows); setHeaders(h); setMap(autoMap(h, def.fields)); setResult(null);
  }

  function downloadTemplate() {
    const blob = new Blob([templates[kind]], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `nexusiq-${kind}-template.csv`; a.click();
  }

  async function run() {
    const cid = company!.id;
    setBusy(true);
    try {
      const vals: any[] = good.map((g) => g.values);
      let skipped = 0;
      const lookup = async () => {
        const [p, w, s] = await Promise.all([
          supabase.from("products").select("id, sku").eq("company_id", cid),
          supabase.from("warehouses").select("id, name").eq("company_id", cid),
          supabase.from("suppliers").select("id, name").eq("company_id", cid),
        ]);
        return {
          sku: new Map((p.data ?? []).map((x) => [x.sku.toLowerCase(), x.id])),
          wh: new Map((w.data ?? []).map((x) => [x.name.toLowerCase(), x.id])), firstWh: w.data?.[0]?.id,
          sup: new Map((s.data ?? []).map((x) => [x.name.toLowerCase(), x.id])),
        };
      };
      const L = await lookup();
      const chunk = async (table: any, rows: any[], opts?: any) => {
        for (let i = 0; i < rows.length; i += 500) {
          const q = supabase.from(table) as any;
          const { error } = opts ? await q.upsert(rows.slice(i, i + 500), opts) : await q.insert(rows.slice(i, i + 500));
          if (error) throw error;
        }
      };
      if (kind === "suppliers") {
        const fresh = vals.filter((v) => !L.sup.has(v.name.toLowerCase()));
        skipped = vals.length - fresh.length;
        await chunk("suppliers", fresh.map((v) => ({ ...v, company_id: cid })));
      } else if (kind === "products") {
        const rows = vals.map(({ supplier, ...v }) => ({ ...v, company_id: cid, supplier_id: supplier ? L.sup.get(String(supplier).toLowerCase()) ?? null : null }));
        await chunk("products", rows, { onConflict: "company_id,sku" });
      } else if (kind === "inventory") {
        const rows = vals.flatMap((v) => {
          const pid = L.sku.get(v.sku.toLowerCase());
          const wid = v.warehouse ? L.wh.get(String(v.warehouse).toLowerCase()) : L.firstWh;
          if (!pid || !wid) { skipped++; return []; }
          return [{ company_id: cid, product_id: pid, warehouse_id: wid, quantity: v.quantity, updated_at: new Date().toISOString() }];
        });
        await chunk("inventory", rows, { onConflict: "product_id,warehouse_id" });
      } else {
        const rows = vals.flatMap((v) => {
          const pid = L.sku.get(v.sku.toLowerCase());
          if (!pid) { skipped++; return []; }
          return [{ company_id: cid, product_id: pid, sale_date: v.date, quantity: v.quantity }];
        });
        await chunk("sales_history", rows);
      }
      const n = vals.length - skipped;
      const msg = `Imported ${n} ${def.label.toLowerCase()} row${n === 1 ? "" : "s"}.` +
        (skipped ? ` ${skipped} skipped (${kind === "suppliers" ? "already exist" : "unknown SKU or warehouse"}).` : "") +
        (bad.length ? ` ${bad.length} invalid rows not imported.` : "");
      setResult(msg); toast.success(msg);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message ?? "Import failed — nothing after the failing batch was saved.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Data Import Center" description="Upload CSV or Excel (.xlsx). Map columns, check errors, then import." />
      <Tabs value={kind} onValueChange={(v) => reset(v as ImportKind)} className="mb-4">
        <TabsList>{(Object.keys(importDefs) as ImportKind[]).map((k) => <TabsTrigger key={k} value={k}>{importDefs[k].label}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="font-semibold">1. Upload</h2>
          <p className="mt-1 text-sm text-muted-foreground">{def.help}</p>
          <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm hover:bg-muted">
            <Upload className="h-5 w-5 text-primary" />
            {file ? <span className="font-medium">{file} · {raw.length} rows</span> : <span>Choose a .csv or .xlsx file</span>}
            <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" disabled={!canEdit} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <Button variant="link" className="mt-2 px-0" onClick={downloadTemplate}><FileSpreadsheet /> Download template</Button>
          {!canEdit && <p className="text-xs text-muted-foreground">Your role can't import data.</p>}
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="font-semibold">2. Map columns</h2>
          {!headers.length ? <p className="mt-2 text-sm text-muted-foreground">Upload a file first.</p> : (
            <div className="mt-3 space-y-2">
              {def.fields.map((f) => (
                <div key={f.key} className="grid grid-cols-2 items-center gap-2">
                  <Label className="text-sm">{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                  <Select value={map[f.key] ?? "__none"} onValueChange={(v) => setMap({ ...map, [f.key]: v === "__none" ? "" : v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="__none">— Skip —</SelectItem>{headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="font-semibold">3. Validate & import</h2>
          {!raw.length ? <p className="mt-2 text-sm text-muted-foreground">Nothing to check yet.</p> : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-success/10 p-3"><div className="tabular text-xl text-success">{good.length}</div><div className="text-xs text-muted-foreground">valid rows</div></div>
                <div className="rounded-lg bg-destructive/10 p-3"><div className="tabular text-xl text-destructive">{bad.length}</div><div className="text-xs text-muted-foreground">with errors</div></div>
              </div>
              <Button className="mt-4 w-full" disabled={!good.length || busy || !canEdit} onClick={run}>
                {busy && <Loader2 className="animate-spin" />} Import {good.length} rows
              </Button>
              {result && <p className="mt-3 flex gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4 shrink-0" />{result}</p>}
            </>
          )}
        </div>
      </div>
      {bad.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader><TableRow><TableHead className="w-20">Row</TableHead><TableHead>Problems</TableHead></TableRow></TableHeader>
            <TableBody>
              {bad.slice(0, 50).map((b) => <TableRow key={b.row}><TableCell className="tabular">{b.row}</TableCell><TableCell className="text-sm text-destructive">{b.errors.join("; ")}</TableCell></TableRow>)}
            </TableBody>
          </Table>
          {bad.length > 50 && <p className="p-3 text-xs text-muted-foreground">…and {bad.length - 50} more.</p>}
        </div>
      )}
    </>
  );
}
