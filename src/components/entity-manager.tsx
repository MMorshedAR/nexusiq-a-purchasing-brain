import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = any;
export type Field = {
  key: string; label: string; type?: "text" | "number" | "email" | "select";
  required?: boolean; options?: { value: string; label: string }[]; placeholder?: string; full?: boolean;
};
export type Column = { key: string; label: string; render?: (r: Row) => ReactNode; align?: "right" };

export function EntityManager(props: {
  table: "products" | "suppliers" | "warehouses";
  title: string; description: string; singular: string;
  select?: string; fields: Field[]; columns: Column[]; searchKeys: string[]; orderBy?: string;
}) {
  const { company, canEdit } = useWorkspace();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const key = [props.table, company?.id];

  const q = useQuery({
    queryKey: key,
    enabled: !!company,
    queryFn: async () => {
      const { data, error } = await (supabase.from(props.table) as any)
        .select(props.select ?? "*").eq("company_id", company!.id).order(props.orderBy ?? "name");
      if (error) throw error;
      return data as Row[];
    },
  });

  const rows = useMemo(() => {
    const s = search.toLowerCase().trim();
    return (q.data ?? []).filter((r) => !s || props.searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s)));
  }, [q.data, search, props.searchKeys]);

  const save = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const t = supabase.from(props.table) as any;
      const { error } = editing
        ? await t.update(values).eq("id", editing.id)
        : await t.insert({ ...values, company_id: company!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${props.singular} saved`); setOpen(false); qc.invalidateQueries({ queryKey: [props.table] }); qc.invalidateQueries({ queryKey: ["overview"] }); },
    onError: (e: any) => toast.error(e.message?.includes("duplicate") ? "That code already exists." : e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(props.table) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${props.singular} deleted`); setDeleting(null); qc.invalidateQueries({ queryKey: [props.table] }); qc.invalidateQueries({ queryKey: ["overview"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: Record<string, any> = {};
    for (const f of props.fields) {
      const raw = fd.get(f.key);
      const v = raw === null ? "" : String(raw).trim();
      values[f.key] = f.type === "number" ? (v === "" ? 0 : Number(v)) : v === "" || v === "__none" ? null : v;
    }
    save.mutate(values);
  }

  return (
    <>
      <PageHeader
        title={props.title} description={props.description}
        actions={canEdit ? <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Add {props.singular.toLowerCase()}</Button>
          : <span className="text-xs text-muted-foreground">Read-only for your role</span>}
      />
      <div className="rounded-xl border bg-card shadow-card">
        <div className="flex items-center gap-2 border-b p-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${props.title.toLowerCase()}…`} className="h-8 border-0 shadow-none focus-visible:ring-0" />
          <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">{rows.length} of {q.data?.length ?? 0}</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              {props.columns.map((c) => <TableHead key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.label}</TableHead>)}
              {canEdit && <TableHead className="w-24" />}
            </TableRow></TableHeader>
            <TableBody>
              {q.isLoading && <TableRow><TableCell colSpan={99} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {!q.isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={99} className="py-12 text-center text-muted-foreground">
                  {q.data?.length ? "No matches." : `No ${props.title.toLowerCase()} yet.`}
                </TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  {props.columns.map((c) => <TableCell key={c.key} className={c.align === "right" ? "text-right tabular" : ""}>{c.render ? c.render(r) : r[c.key] ?? "—"}</TableCell>)}
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditing(r); setOpen(true); }}><Pencil /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setDeleting(r)}><Trash2 /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? `Edit ${props.singular.toLowerCase()}` : `New ${props.singular.toLowerCase()}`}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4" key={editing?.id ?? "new"}>
            {props.fields.map((f) => (
              <div key={f.key} className={"space-y-1.5 " + (f.full ? "col-span-2" : "")}>
                <Label htmlFor={f.key}>{f.label}</Label>
                {f.type === "select" ? (
                  <Select name={f.key} defaultValue={editing?.[f.key] ?? "__none"}>
                    <SelectTrigger id={f.key}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— None —</SelectItem>
                      {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id={f.key} name={f.key} type={f.type ?? "text"} required={f.required} placeholder={f.placeholder}
                    step={f.type === "number" ? "any" : undefined} min={f.type === "number" ? 0 : undefined}
                    defaultValue={editing?.[f.key] ?? ""} />
                )}
              </div>
            ))}
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes it from your workspace.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && del.mutate(deleting.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
