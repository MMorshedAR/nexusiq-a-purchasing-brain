import { supabase } from "@/integrations/supabase/client";
import { loadStock } from "./stock";
import { dailySeries, eoq, forecast, mean, reorderPoint, safetyStock, stdDev, suggestedQty, urgency } from "./planning";

export const HISTORY_DAYS = 90;
export const ORDER_COST = 500; // ৳ per purchase order (assumption, shown in UI)
export const HOLDING_RATE = 0.2; // 20% of unit cost per year (assumption, shown in UI)

export type PlanRow = {
  id: string; sku: string; name: string; category: string | null; supplierId: string | null; supplier: string | null;
  unitCost: number; leadDays: number; onHand: number; onOrder: number;
  series: number[]; avgDaily: number; sd: number; slope: number; forecast30: number; forecastDaily: number[];
  hasHistory: boolean; ss: number; rop: number; eoq: number; suggested: number; daysCover: number | null; priority: number;
};

export async function loadPlanning(companyId: string) {
  const end = new Date();
  const start = new Date(end.getTime() - (HISTORY_DAYS - 1) * 86400000).toISOString().slice(0, 10);
  const [stock, prods, sales, open] = await Promise.all([
    loadStock(companyId),
    supabase.from("products").select("id, supplier_id, lead_time_days").eq("company_id", companyId),
    supabase.from("sales_history").select("product_id, sale_date, quantity").eq("company_id", companyId).gte("sale_date", start).limit(50000),
    supabase.from("po_items").select("product_id, quantity, purchase_orders!inner(status)").eq("company_id", companyId).eq("purchase_orders.status", "approved"),
  ]);
  for (const r of [prods, sales, open]) if (r.error) throw r.error;
  const meta = new Map((prods.data ?? []).map((p) => [p.id, p]));
  const onOrder = new Map<string, number>();
  for (const i of open.data ?? []) onOrder.set(i.product_id, (onOrder.get(i.product_id) ?? 0) + i.quantity);
  const salesBy = new Map<string, { sale_date: string; quantity: number }[]>();
  for (const s of sales.data ?? []) {
    const arr = salesBy.get(s.product_id) ?? [];
    arr.push(s);
    salesBy.set(s.product_id, arr);
  }

  const rows: PlanRow[] = stock.rows.map((r) => {
    const m = meta.get(r.id);
    const leadDays = m?.lead_time_days ?? 7;
    const series = dailySeries(salesBy.get(r.id) ?? [], HISTORY_DAYS, end);
    const hasHistory = series.some((x) => x > 0);
    const f = forecast(series, 30);
    const avgDaily = mean(series.slice(-28));
    const sd = stdDev(series.slice(-28));
    // Without sales history, fall back to the manually set reorder point.
    const ss = hasHistory ? safetyStock(sd, leadDays) : 0;
    const rop = hasHistory ? reorderPoint(avgDaily, leadDays, ss) : r.reorder_point;
    const e = eoq(avgDaily * 365, ORDER_COST, r.unit_cost * HOLDING_RATE);
    const oo = onOrder.get(r.id) ?? 0;
    return {
      id: r.id, sku: r.sku, name: r.name, category: r.category, supplierId: m?.supplier_id ?? null, supplier: r.supplier,
      unitCost: r.unit_cost, leadDays, onHand: r.onHand, onOrder: oo,
      series, avgDaily, sd, slope: f.slope, forecast30: f.total, forecastDaily: f.daily, hasHistory,
      ss, rop, eoq: e,
      suggested: suggestedQty({ onHand: r.onHand, onOrder: oo, rop, avgDaily, eoq: e }),
      daysCover: avgDaily > 0 ? r.onHand / avgDaily : null,
      priority: urgency(r.onHand + oo, avgDaily, leadDays),
    };
  });
  return { rows, warehouses: stock.warehouses };
}
