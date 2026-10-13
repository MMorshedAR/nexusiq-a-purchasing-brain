import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { formatBDT, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/_authenticated/app/purchase-orders")({
  head: () => ({ meta: [{ title: "Purchase Orders — NexusIQ" }, { name: "description", content: "Draft, approve and receive purchase orders." }, { property: "og:title", content: "Purchase Orders — NexusIQ" }, { property: "og:description", content: "Draft, approve and receive purchase orders." }] }),
  component: POs,
});

const statusCls: Record<string, string> = {
  draft: "bg-muted text-muted-foreground", approved: "bg-accent text-accent-foreground",
  received: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive",
};

function usePOs(companyId?: string) {
  return useQuery({
    queryKey: ["pos", companyId], enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders")
        .select("*, supplier:suppliers(name), warehouse:warehouses(name), items:po_items(id, quantity, unit_cost, product:products(name, sku))")
        .eq("company_id", companyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function POs() {
  const { company, canEdit } = useWorkspace();
  const cur = company?.currency;
  const q = usePOs(company?.id);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = (q.data ?? []).filter((p) => filter === "all" || p.status === filter);
  const total = (p: any) => p.items.reduce((s: number, i: any) => s + i.quantity * Number(i.unit_cost), 0);
  const open = q.data?.find((p) => p.id === openId);

  return (
    <>
      <PageHeader title="Purchase Orders" description="Draft → Approved → Received. Receiving adds the stock to the chosen warehouse."
        actions={canEdit && <Button onClick={() => setCreating(true)}><Plus /> New purchase order</Button>} />
      <ToggleGroup type="single" value={filter} onValueChange={(v) => setFilter(v || "all")} variant="outline" size="sm" className="mb-4 justify-start">
        {["all", "draft", "approved", "received", "cancelled"].map((s) => <ToggleGroupItem key={s} value={s} className="capitalize">{s}</ToggleGroupItem>)}
      </ToggleGroup>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>PO</TableHead><TableHead>Supplier</TableHead><TableHead>Warehouse</TableHead><TableHead>Ordered</TableHead>
            <TableHead>Expected</TableHead><TableHead className="text-right">Lines</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!q.isLoading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">No purchase orders{filter !== "all" ? ` with status ${filter}` : " yet"}.</TableCell></TableRow>}
            {rows.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpenId(p.id)}>
                <TableCell className="tabular text-sm font-medium">{p.po_number}</TableCell>
                <TableCell>{p.supplier?.name ?? "—"}</TableCell>
                <TableCell>{p.warehouse?.name ?? "—"}</TableCell>
                <TableCell className="tabular text-sm">{p.order_date}</TableCell>
                <TableCell className="tabular text-sm">{p.expected_date ?? "—"}</TableCell>
                <TableCell className="tabular text-right">{p.items.length}</TableCell>
                <TableCell className="tabular text-right">{formatBDT(total(p), cur)}</TableCell>
                <TableCell><span className={"rounded-full px-2 py-0.5 text-xs font-medium capitalize " + statusCls[p.status]}>{p.status}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {open && <PODetail po={open} onClose={() => setOpenId(null)} total={total(open)} />}
      {creating && <CreatePO onClose={() => setCreating(false)} />}
    </>
  );
}

function PODetail({ po, onClose, total }: { po: any; onClose: () => void; total: number }) {
  const { company, canEdit } = useWorkspace();
  const qc = useQueryClient();
  const done = (msg: string) => { toast.success(msg); qc.invalidateQueries({ queryKey: ["pos"] }); qc.invalidateQueries({ queryKey: ["overview"] }); qc.invalidateQueries({ queryKey: ["planning"] }); };
  const act = useMutation({
    mutationFn: async (action: "approve" | "receive" | "cancel" | "delete") => {
      if (action === "receive") { const { error } = await supabase.rpc("receive_purchase_order", { _po: po.id }); if (error) throw error; return "Received — stock updated"; }
      if (action === "delete") { const { error } = await supabase.from("purchase_orders").delete().eq("id", po.id); if (error) throw error; onClose(); return "Draft deleted"; }
      const patch = action === "approve" ? { status: "approved" as const, approved_at: new Date().toISOString() } : { status: "cancelled" as const };
      const { error } = await supabase.from("purchase_orders").update(patch).eq("id", po.id);
      if (error) throw error;
      return action === "approve" ? "Approved" : "Cancelled";
    },
    onSuccess: done, onError: (e: any) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="tabular">{po.po_number}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Supplier</div>{po.supplier?.name ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground">Receiving warehouse</div>{po.warehouse?.name ?? "—"}</div>
          <div><div className="text-xs text-muted-foreground">Status</div><span className="capitalize">{po.status}</span></div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit cost</TableHead><TableHead className="text-right">Line total</TableHead></TableRow></TableHeader>
          <TableBody>
            {po.items.map((i: any) => (
              <TableRow key={i.id}>
                <TableCell>{i.product?.name} <span className="tabular text-xs text-muted-foreground">{i.product?.sku}</span></TableCell>
                <TableCell className="tabular text-right">{formatNumber(i.quantity)}</TableCell>
                <TableCell className="tabular text-right">{formatBDT(i.unit_cost, company?.currency)}</TableCell>
                <TableCell className="tabular text-right">{formatBDT(i.quantity * Number(i.unit_cost), company?.currency)}</TableCell>
              </TableRow>
            ))}
            <TableRow><TableCell colSpan={3} className="text-right font-medium">Total</TableCell><TableCell className="tabular text-right font-medium">{formatBDT(total, company?.currency)}</TableCell></TableRow>
          </TableBody>
        </Table>
        {po.notes && <p className="text-sm text-muted-foreground">{po.notes}</p>}
        {canEdit && (
          <DialogFooter className="gap-2">
            {po.status === "draft" && <Button variant="ghost" onClick={() => act.mutate("delete")}>Delete draft</Button>}
            {(po.status === "draft" || po.status === "approved") && <Button variant="outline" onClick={() => act.mutate("cancel")}>Cancel order</Button>}
            {po.status === "draft" && <Button disabled={act.isPending} onClick={() => act.mutate("approve")}>Approve</Button>}
            {po.status === "approved" && <Button disabled={act.isPending} onClick={() => act.mutate("receive")}>Mark received</Button>}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreatePO({ onClose }: { onClose: () => void }) {
  const { company } = useWorkspace();
  const qc = useQueryClient();
  const opts = useQuery({
    queryKey: ["po-options", company?.id], enabled: !!company,
    queryFn: async () => {
      const [s, w, p] = await Promise.all([
        supabase.from("suppliers").select("id, name").eq("company_id", company!.id).order("name"),
        supabase.from("warehouses").select("id, name").eq("company_id", company!.id).order("name"),
        supabase.from("products").select("id, name, sku, unit_cost, supplier_id").eq("company_id", company!.id).order("name"),
      ]);
      return { suppliers: s.data ?? [], warehouses: w.data ?? [], products: p.data ?? [] };
    },
  });
  const [supplier, setSupplier] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [expected, setExpected] = useState("");
  const [lines, setLines] = useState<{ product_id: string; quantity: number; unit_cost: number }[]>([]);
  const products = opts.data?.products ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const valid = lines.filter((l) => l.product_id && l.quantity > 0);
      if (!valid.length) throw new Error("Add at least one product with a quantity.");
      const { data: { user } } = await supabase.auth.getUser();
      const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      const { data: po, error } = await supabase.from("purchase_orders").insert({
        company_id: company!.id, po_number: `PO-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        supplier_id: supplier || null, warehouse_id: warehouse || opts.data?.warehouses[0]?.id || null, expected_date: expected || null, created_by: user?.id,
      }).select("id").single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("po_items").insert(valid.map((l) => ({ ...l, company_id: company!.id, po_id: po.id })));
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Draft purchase order created"); qc.invalidateQueries({ queryKey: ["pos"] }); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>New purchase order</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Supplier</Label>
            <Select value={supplier} onValueChange={setSupplier}><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>{opts.data?.suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label>Warehouse</Label>
            <Select value={warehouse || opts.data?.warehouses[0]?.id || ""} onValueChange={setWarehouse}><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>{opts.data?.warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label>Expected date</Label><Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></div>
        </div>
        <div className="space-y-2">
          {lines.map((l, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_90px_120px_auto] gap-2">
              <Select value={l.product_id} onValueChange={(v) => setLines(lines.map((x, i) => i === idx ? { ...x, product_id: v, unit_cost: Number(products.find((p) => p.id === v)?.unit_cost ?? 0) } : x))}>
                <SelectTrigger aria-label="Product"><SelectValue placeholder="Product" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.sku}</SelectItem>)}</SelectContent>
              </Select>
              <Input aria-label="Quantity" type="number" min={1} value={l.quantity} onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
              <Input aria-label="Unit cost" type="number" min={0} value={l.unit_cost} onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, unit_cost: Number(e.target.value) } : x))} />
              <Button size="icon" variant="ghost" aria-label="Remove line" onClick={() => setLines(lines.filter((_, i) => i !== idx))}><Trash2 /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { product_id: "", quantity: 1, unit_cost: 0 }])}><Plus /> Add line</Button>
          {!products.length && !opts.isLoading && <p className="text-sm text-muted-foreground">Add products first to create an order.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>Save draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
