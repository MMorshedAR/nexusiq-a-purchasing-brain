import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/activity")({
  head: () => ({ meta: [{ title: "Activity log — NexusIQ" }, { name: "description", content: "Who changed what in your workspace." }, { property: "og:title", content: "Activity log — NexusIQ" }, { property: "og:description", content: "Workspace audit history." }] }),
  component: Activity,
});

const entityLabel: Record<string, string> = { products: "Product", suppliers: "Supplier", warehouses: "Warehouse", purchase_orders: "Purchase order", inventory: "Stock" };
const actionCls: Record<string, string> = { insert: "text-success", update: "text-chart-2", delete: "text-destructive" };
const actionLabel: Record<string, string> = { insert: "Created", update: "Updated", delete: "Deleted" };

function Activity() {
  const { company } = useWorkspace();
  const q = useQuery({
    queryKey: ["audit", company?.id], enabled: !!company,
    queryFn: async () => (await supabase.from("audit_log").select("*").eq("company_id", company!.id).order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  return (
    <>
      <PageHeader title="Activity log" description="The latest 200 changes to products, suppliers, warehouses, stock and purchase orders." />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Who</TableHead><TableHead>Action</TableHead><TableHead>What</TableHead></TableRow></TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!q.isLoading && !q.data?.length && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No activity yet.</TableCell></TableRow>}
            {q.data?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="tabular whitespace-nowrap text-xs">{new Date(a.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                <TableCell className="text-sm">{a.actor_email ?? "System"}</TableCell>
                <TableCell className={"text-sm font-medium " + (actionCls[a.action] ?? "")}>{actionLabel[a.action] ?? a.action} {entityLabel[a.entity]?.toLowerCase() ?? a.entity}</TableCell>
                <TableCell className="text-sm">{a.summary ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
