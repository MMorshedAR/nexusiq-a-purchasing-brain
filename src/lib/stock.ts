import { supabase } from "@/integrations/supabase/client";
import { stockStatus, type StockStatus } from "./format";

export type StockRow = {
  id: string; sku: string; name: string; category: string | null; unit_cost: number; reorder_point: number;
  supplier: string | null; onHand: number; value: number; status: StockStatus; byWarehouse: Record<string, number>;
};

export async function loadStock(companyId: string) {
  const [p, w, i, s] = await Promise.all([
    supabase.from("products").select("id, sku, name, category, unit_cost, reorder_point, supplier:suppliers(name)").eq("company_id", companyId).order("name"),
    supabase.from("warehouses").select("id, name").eq("company_id", companyId).order("name"),
    supabase.from("inventory").select("product_id, warehouse_id, quantity").eq("company_id", companyId),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ]);
  for (const r of [p, w, i]) if (r.error) throw r.error;
  const inv = i.data ?? [];
  const rows: StockRow[] = (p.data ?? []).map((prod: any) => {
    const byWarehouse: Record<string, number> = {};
    for (const x of inv) if (x.product_id === prod.id) byWarehouse[x.warehouse_id] = x.quantity;
    const onHand = Object.values(byWarehouse).reduce((a, b) => a + b, 0);
    return {
      id: prod.id, sku: prod.sku, name: prod.name, category: prod.category, unit_cost: Number(prod.unit_cost),
      reorder_point: prod.reorder_point, supplier: prod.supplier?.name ?? null,
      onHand, value: onHand * Number(prod.unit_cost), status: stockStatus(onHand, prod.reorder_point), byWarehouse,
    };
  });
  return { rows, warehouses: w.data ?? [], supplierCount: s.count ?? 0 };
}
