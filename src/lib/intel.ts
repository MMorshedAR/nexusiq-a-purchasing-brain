/** Pure analytics for Phase 3: supplier scoring, disruption simulation, cash flow projection. */

export type SupplierOrder = { order_date: string; expected_date: string | null; received_at: string | null; status: string; value: number };

const days = (a: string, b: string) => (Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86400000;

/**
 * Supplier score (0–100) from received orders:
 *  60% on-time rate (received on/before expected date),
 *  40% lead-time accuracy (1 − |actual − promised| / promised, floored at 0).
 * Returns null score when there are no received orders yet.
 */
export function scoreSupplier(orders: SupplierOrder[], promisedLead: number) {
  const received = orders.filter((o) => o.status === "received" && o.received_at);
  const withExpected = received.filter((o) => o.expected_date);
  const onTime = withExpected.filter((o) => days(o.expected_date!, o.received_at!) <= 0).length;
  const onTimeRate = withExpected.length ? onTime / withExpected.length : null;
  const leads = received.map((o) => days(o.order_date, o.received_at!));
  const avgLead = leads.length ? leads.reduce((a, b) => a + b, 0) / leads.length : null;
  const accuracy = avgLead === null || promisedLead <= 0 ? null : Math.max(0, 1 - Math.abs(avgLead - promisedLead) / promisedLead);
  let score: number | null = null;
  if (onTimeRate !== null && accuracy !== null) score = Math.round(60 * onTimeRate + 40 * accuracy);
  else if (accuracy !== null) score = Math.round(100 * accuracy);
  const spend = orders.filter((o) => o.status !== "cancelled").reduce((a, o) => a + o.value, 0);
  return { score, onTimeRate, avgLead, accuracy, received: received.length, total: orders.length, spend };
}

export function riskBand(score: number | null): "unknown" | "low" | "medium" | "high" {
  if (score === null) return "unknown";
  return score >= 80 ? "low" : score >= 60 ? "medium" : "high";
}

export type SimProduct = { id: string; onHand: number; onOrder: number; avgDaily: number; leadDays: number; unitCost: number; sellPrice: number; supplierId: string | null };
export type Scenario = { delayDays: number; supplierId: string | "all"; demandPct: number; pricePct: number; horizon: number };

/**
 * Disruption simulation over `horizon` days.
 * Demand scales by demandPct. Affected suppliers' lead time grows by delayDays, so stock on order
 * arrives later and only on-hand stock covers the extended gap.
 * Shortfall = demand during (lead + delay) not covered by on-hand stock, capped at the horizon.
 */
export function simulate(products: SimProduct[], s: Scenario) {
  const rows = products.map((p) => {
    const affected = s.supplierId === "all" || p.supplierId === s.supplierId;
    const demand = p.avgDaily * (1 + s.demandPct / 100);
    const lead = p.leadDays + (affected ? s.delayDays : 0);
    const gap = Math.min(lead, s.horizon);
    const coverDays = demand > 0 ? p.onHand / demand : Infinity;
    const stockoutDays = Math.max(0, Math.round(gap - coverDays));
    const lostUnits = Math.round(stockoutDays * demand);
    const lostRevenue = lostUnits * p.sellPrice;
    const replenishQty = Math.ceil(demand * s.horizon);
    const extraCost = affected ? replenishQty * p.unitCost * (s.pricePct / 100) : 0;
    return { id: p.id, affected, coverDays, stockoutDays, lostUnits, lostRevenue, extraCost };
  });
  return {
    rows,
    atRisk: rows.filter((r) => r.stockoutDays > 0).length,
    lostRevenue: rows.reduce((a, r) => a + r.lostRevenue, 0),
    extraCost: rows.reduce((a, r) => a + r.extraCost, 0),
  };
}

export type CashOut = { date: string; amount: number; label: string };

/** Weekly cash projection: opening + inflows (weekly sales revenue) − outflows (by due date). */
export function projectCash(opening: number, weeklyInflow: number, outflows: CashOut[], weeks: number, start: Date) {
  const t0 = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  let bal = opening;
  return Array.from({ length: weeks }, (_, w) => {
    const from = t0 + w * 7 * 86400000, to = from + 7 * 86400000;
    const out = outflows.filter((o) => { const t = Date.parse(o.date); return (w === 0 ? t < to : t >= from && t < to); }).reduce((a, o) => a + o.amount, 0);
    bal = bal + weeklyInflow - out;
    return { week: w + 1, label: new Date(from).toISOString().slice(5, 10), inflow: weeklyInflow, outflow: out, balance: bal };
  });
}
