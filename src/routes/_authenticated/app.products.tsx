import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { EntityManager } from "@/components/entity-manager";
import { formatBDT } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/products")({
  head: () => ({ meta: [{ title: "Products — NexusIQ" }, { name: "description", content: "Your product catalogue with costs and reorder settings." }, { property: "og:title", content: "Products — NexusIQ" }, { property: "og:description", content: "Your product catalogue." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Products,
});

function Products() {
  const { company } = useWorkspace();
  const cur = company?.currency;
  const suppliers = useQuery({
    queryKey: ["suppliers", company?.id, "options"],
    enabled: !!company,
    queryFn: async () => (await supabase.from("suppliers").select("id, name").eq("company_id", company!.id).order("name")).data ?? [],
  });
  return (
    <EntityManager
      table="products" title="Products" singular="Product" description="Catalogue, costs and reorder settings."
      select="*, supplier:suppliers(name)"
      searchKeys={["name", "sku", "category"]}
      fields={[
        { key: "sku", label: "SKU", required: true },
        { key: "name", label: "Product name", required: true },
        { key: "category", label: "Category" },
        { key: "unit", label: "Unit", placeholder: "pcs, kg, carton" },
        { key: "unit_cost", label: `Unit cost (${cur})`, type: "number" },
        { key: "sell_price", label: `Sell price (${cur})`, type: "number" },
        { key: "supplier_id", label: "Primary supplier", type: "select", full: true, options: (suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name })) },
        { key: "lead_time_days", label: "Lead time (days)", type: "number" },
        { key: "safety_stock", label: "Safety stock", type: "number" },
        { key: "reorder_point", label: "Reorder point", type: "number" },
      ]}
      columns={[
        { key: "sku", label: "SKU", render: (r) => <span className="tabular text-xs">{r.sku}</span> },
        { key: "name", label: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "category", label: "Category" },
        { key: "supplier", label: "Supplier", render: (r) => r.supplier?.name ?? "—" },
        { key: "unit_cost", label: "Cost", align: "right", render: (r) => formatBDT(r.unit_cost, cur) },
        { key: "sell_price", label: "Price", align: "right", render: (r) => formatBDT(r.sell_price, cur) },
        { key: "reorder_point", label: "Reorder at", align: "right" },
      ]}
    />
  );
}
