import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace";
import { formatBDT, formatNumber } from "@/lib/format";
import { loadStock } from "@/lib/stock";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/reports")({
  head: () => ({ meta: [
    { title: "Reports & Analytics — NexusIQ" },
    { name: "description", content: "Export workspace inventory, supplier and purchasing data." },
    { property: "og:title", content: "Reports & Analytics — NexusIQ" },
    { property: "og:description", content: "Export workspace inventory, supplier and purchasing data." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Reports,
});

type ReportKind = "inventory" | "suppliers" | "purchases";

function Reports() {
  const { company } = useWorkspace();
  const { t } = useLanguage();
  const [kind, setKind] = useState<ReportKind>("inventory");
  const [format, setFormat] = useState<"csv" | "xlsx">("xlsx");
  const q = useQuery({
    queryKey: ["report", kind, company?.id], enabled: !!company,
    queryFn: async (): Promise<Record<string, unknown>[]> => {
      if (!company) return [] as Record<string, unknown>[];
      if (kind === "inventory") {
        const [stock, products, inventory, warehouses] = await Promise.all([
          loadStock(company.id),
          supabase.from("products").select("id,sku,name,category,unit,unit_cost,sell_price,reorder_point,lead_time_days,supplier:suppliers(name)").eq("company_id", company.id).order("name"),
          supabase.from("inventory").select("product_id,warehouse_id,quantity").eq("company_id", company.id),
          supabase.from("warehouses").select("id,name").eq("company_id", company.id).order("name"),
        ]);
        for (const result of [products, inventory, warehouses]) if (result.error) throw result.error;
        const rows: Record<string, unknown>[] = [];
        for (const product of products.data ?? []) {
          const stockRow = stock.rows.find((r) => r.id === product.id);
          const placed = (inventory.data ?? []).filter((r) => r.product_id === product.id);
          const locations = placed.length ? placed : [{ warehouse_id: null, quantity: 0 }];
          for (const entry of locations) {
            rows.push({ SKU: product.sku, Product: product.name, Category: product.category ?? "", Unit: product.unit,
              Supplier: product.supplier?.name ?? "", Warehouse: warehouses.data?.find((w) => w.id === entry.warehouse_id)?.name ?? "",
              "On hand": entry.quantity, "Total on hand": stockRow?.onHand ?? 0, "Unit cost": Number(product.unit_cost),
              "Stock value": Number(product.unit_cost) * Number(entry.quantity ?? 0), "Sell price": Number(product.sell_price),
              "Reorder point": product.reorder_point, "Lead time (days)": product.lead_time_days, Status: stockRow?.status ?? "out" });
          }
        }
        return rows;
      }
      if (kind === "suppliers") {
        const result = await supabase.from("suppliers").select("name,contact_name,email,phone,country,lead_time_days,payment_terms,created_at").eq("company_id", company.id).order("name");
        if (result.error) throw result.error;
        return (result.data ?? []).map((r) => ({ Supplier: r.name, Contact: r.contact_name ?? "", Email: r.email ?? "", Phone: r.phone ?? "", Country: r.country ?? "", "Lead time (days)": r.lead_time_days, "Payment terms": r.payment_terms ?? "", "Created at": r.created_at }));
      }
      const result = await supabase.from("purchase_orders").select("po_number,status,order_date,expected_date,received_at,notes,supplier:suppliers(name),warehouse:warehouses(name),items:po_items(quantity,unit_cost,product:products(sku,name))").eq("company_id", company.id).order("order_date", { ascending: false });
      if (result.error) throw result.error;
      return (result.data ?? []).flatMap((order) => {
        const items = order.items ?? [];
        const total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_cost), 0);
        return items.length ? items.map((item) => ({ "PO number": order.po_number, Status: order.status, Supplier: order.supplier?.name ?? "", Warehouse: order.warehouse?.name ?? "", "Order date": order.order_date, "Expected date": order.expected_date ?? "", "Received at": order.received_at ?? "", SKU: item.product?.sku ?? "", Product: item.product?.name ?? "", Quantity: item.quantity, "Unit cost": Number(item.unit_cost), "Line total": Number(item.quantity) * Number(item.unit_cost), "Order total": total, Notes: order.notes ?? "" })) : [{ "PO number": order.po_number, Status: order.status, Supplier: order.supplier?.name ?? "", Warehouse: order.warehouse?.name ?? "", "Order date": order.order_date, "Expected date": order.expected_date ?? "", "Received at": order.received_at ?? "", SKU: "", Product: "", Quantity: 0, "Unit cost": 0, "Line total": 0, "Order total": 0, Notes: order.notes ?? "" }];
      });
    },
  });
  const rows = q.data ?? [];
  const summary = useMemo(() => {
    if (kind === "inventory") return `${formatNumber(new Set(rows.map((r) => r["SKU"]).filter(Boolean)).size)} products · ${formatBDT(rows.reduce((n, r) => n + Number(r["Stock value"] ?? 0), 0), company?.currency)}`;
    if (kind === "suppliers") return `${formatNumber(rows.length)} suppliers`;
    return `${formatNumber(new Set(rows.map((r) => r["PO number"]).filter(Boolean)).size)} purchase orders · ${formatNumber(rows.length)} line items`;
  }, [company?.currency, kind, rows]);

  async function download() {
    if (!rows.length) return void toast.error("There is no data to export yet.");
    try {
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, kind === "inventory" ? "Inventory" : kind === "suppliers" ? "Suppliers" : "Purchases");
      const sheetName = kind === "inventory" ? "inventory" : kind;
      if (format === "csv") XLSX.writeFile(book, `nexusiq-${sheetName}-${new Date().toISOString().slice(0, 10)}.csv`, { bookType: "csv" });
      else XLSX.writeFile(book, `nexusiq-${sheetName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "The report could not be downloaded."); }
  }

  return <>
    <PageHeader title={t("Reports & Analytics")} description={t("Download live workspace records as CSV or Excel.")} actions={<Button onClick={download} disabled={q.isLoading || !rows.length}><Download /> {t("Download")} {format.toUpperCase()}</Button>} />
    <div className="flex flex-wrap items-end gap-4 border-b pb-5">
      <div className="w-56 space-y-2"><label className="text-sm font-medium">{t("Report")}</label><Select value={kind} onValueChange={(value) => setKind(value as ReportKind)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inventory">{t("Inventory")}</SelectItem><SelectItem value="suppliers">{t("Suppliers")}</SelectItem><SelectItem value="purchases">{t("Purchase orders")}</SelectItem></SelectContent></Select></div>
      <div className="w-40 space-y-2"><label className="text-sm font-medium">{t("File type")}</label><Select value={format} onValueChange={(value) => setFormat(value as "csv" | "xlsx")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="xlsx">Excel (.xlsx)</SelectItem><SelectItem value="csv">CSV (.csv)</SelectItem></SelectContent></Select></div>
      <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground"><FileSpreadsheet className="h-4 w-4" />{q.isLoading ? t("Preparing report…") : q.isError ? t("Could not load report data") : summary}</div>
    </div>
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground">{(rows[0] ? Object.keys(rows[0]) : []).slice(0, 8).map((key) => <th key={key} className="px-3 py-2 font-medium">{key}</th>)}</tr></thead><tbody>
        {rows.slice(0, 30).map((row, index) => <tr key={`${String(row["SKU"] ?? row["Supplier"] ?? row["PO number"] ?? "record")}-${index}`} className="border-b">{Object.values(row).slice(0, 8).map((value, cell) => <td key={cell} className="max-w-48 truncate px-3 py-2">{String(value ?? "—")}</td>)}</tr>)}
        {!q.isLoading && rows.length === 0 && <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">{t("No records in this report yet.")}</td></tr>}
      </tbody></table>
      {rows.length > 30 && <p className="mt-3 text-xs text-muted-foreground">Showing 30 of {formatNumber(rows.length)} rows. Download the file for the complete report.</p>}
    </div>
  </>;
}