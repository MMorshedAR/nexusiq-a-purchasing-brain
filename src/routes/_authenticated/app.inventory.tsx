import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { loadStock } from "@/lib/stock";
import { formatBDT, formatNumber, type StockStatus } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/_authenticated/app/inventory")({
  head: () => ({ meta: [{ title: "Inventory Intelligence — NexusIQ" }, { name: "description", content: "Stock levels by product and warehouse." }, { property: "og:title", content: "Inventory Intelligence — NexusIQ" }, { property: "og:description", content: "Stock levels by product and warehouse." }] }),
  component: Inventory,
});

function Inventory() {
  const { company, canEdit } = useWorkspace();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | StockStatus>("all");
  const [search, setSearch] = useState("");
  const q = useQuery({ queryKey: ["overview", company?.id], enabled: !!company, queryFn: () => loadStock(company!.id) });

  const save = useMutation({
    mutationFn: async (v: { product_id: string; warehouse_id: string; quantity: number }) => {
      const { error } = await supabase.from("inventory").upsert({ ...v, company_id: company!.id, updated_at: new Date().toISOString() }, { onConflict: "product_id,warehouse_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Stock updated"); qc.invalidateQueries({ queryKey: ["overview"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = useMemo(() => (q.data?.rows ?? []).filter((r) =>
    (filter === "all" || r.status === filter) &&
    (!search || (r.name + r.sku).toLowerCase().includes(search.toLowerCase()))), [q.data, filter, search]);

  const whs = q.data?.warehouses ?? [];
  return (
    <>
      <PageHeader title="Inventory Intelligence" description="On-hand stock per warehouse. Edit a cell and press Enter to save." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input placeholder="Search product or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs bg-card" />
        <ToggleGroup type="single" value={filter} onValueChange={(v) => setFilter((v || "all") as any)} variant="outline" size="sm">
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="out">Out</ToggleGroupItem>
          <ToggleGroupItem value="low">Reorder</ToggleGroupItem>
          <ToggleGroupItem value="ok">Healthy</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Product</TableHead>
            {whs.map((w) => <TableHead key={w.id} className="text-right">{w.name}</TableHead>)}
            <TableHead className="text-right">On hand</TableHead>
            <TableHead className="text-right">Reorder at</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={99} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!q.isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={99} className="py-12 text-center text-muted-foreground">
                {q.data?.rows.length ? "No products match." : <>No products yet. <Button asChild variant="link" className="px-1"><Link to="/app/products">Add your first product</Link></Button></>}
              </TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell><div className="font-medium">{r.name}</div><div className="tabular text-xs text-muted-foreground">{r.sku}</div></TableCell>
                {whs.map((w) => (
                  <TableCell key={w.id} className="text-right">
                    {canEdit ? (
                      <Input
                        key={`${r.id}-${w.id}-${r.byWarehouse[w.id] ?? 0}`}
                        type="number" min={0} defaultValue={r.byWarehouse[w.id] ?? 0}
                        className="tabular ml-auto h-8 w-24 text-right"
                        aria-label={`${r.name} at ${w.name}`}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        onBlur={(e) => {
                          const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          if (n !== (r.byWarehouse[w.id] ?? 0)) save.mutate({ product_id: r.id, warehouse_id: w.id, quantity: n });
                        }}
                      />
                    ) : <span className="tabular">{formatNumber(r.byWarehouse[w.id] ?? 0)}</span>}
                  </TableCell>
                ))}
                <TableCell className="tabular text-right font-medium">{formatNumber(r.onHand)}</TableCell>
                <TableCell className="tabular text-right text-muted-foreground">{formatNumber(r.reorder_point)}</TableCell>
                <TableCell className="tabular text-right">{formatBDT(r.value, company?.currency)}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
