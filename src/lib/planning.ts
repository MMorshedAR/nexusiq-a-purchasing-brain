/** Pure planning math: forecasts, reorder points, EOQ, budget allocation. */

export type Sale = { sale_date: string; quantity: number };

/** Daily quantities for the `days` days ending on `end` (inclusive), oldest first. */
export function dailySeries(sales: Sale[], days: number, end: Date): number[] {
  const out = new Array(days).fill(0);
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  for (const s of sales) {
    const [y = 0, m = 1, d = 1] = s.sale_date.slice(0, 10).split("-").map(Number);
    const idx = days - 1 - Math.round((endUtc - Date.UTC(y, m - 1, d)) / 86400000);
    if (idx >= 0 && idx < days) out[idx] += s.quantity;
  }
  return out;
}

export function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
export function stdDev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Least-squares slope (units/day per day). */
export function trendSlope(xs: number[]) {
  const n = xs.length;
  if (n < 2) return 0;
  const tx = (n - 1) / 2, ty = mean(xs);
  let num = 0, den = 0;
  xs.forEach((y, i) => { num += (i - tx) * (y - ty); den += (i - tx) ** 2; });
  return den ? num / den : 0;
}

/**
 * Baseline forecast: 28-day moving average, adjusted by the linear trend of the full window.
 * Never negative.
 */
export function forecast(series: number[], horizon: number) {
  const recent = series.slice(-28);
  const avgDaily = mean(recent);
  const slope = trendSlope(series);
  const daily = Array.from({ length: horizon }, (_, i) => Math.max(0, avgDaily + slope * (i + 1 + recent.length / 2)));
  return { avgDaily, slope, daily, total: daily.reduce((a, b) => a + b, 0) };
}

/** Safety stock = z · σ(daily) · √leadTime, rounded up. z=1.65 ≈ 95% service level. */
export function safetyStock(sdDaily: number, leadDays: number, z = 1.65) {
  return Math.ceil(z * sdDaily * Math.sqrt(Math.max(0, leadDays)));
}

/** Reorder point = average daily demand · lead time + safety stock, rounded up. */
export function reorderPoint(avgDaily: number, leadDays: number, ss: number) {
  return Math.ceil(avgDaily * leadDays + ss);
}

/** Economic order quantity = √(2·D·S / H). */
export function eoq(annualDemand: number, orderCost: number, holdingCostPerUnitYear: number) {
  if (annualDemand <= 0 || holdingCostPerUnitYear <= 0) return 0;
  return Math.ceil(Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnitYear));
}

/**
 * Suggested order quantity when stock position (on hand + on order) is at or below the reorder point:
 * bring the position up to reorder point + `coverDays` of demand, and at least EOQ.
 */
export function suggestedQty(p: { onHand: number; onOrder: number; rop: number; avgDaily: number; eoq: number; coverDays?: number }) {
  const position = p.onHand + p.onOrder;
  if (position > p.rop) return 0;
  const target = p.rop + p.avgDaily * (p.coverDays ?? 30);
  return Math.max(Math.ceil(target - position), p.eoq, 1);
}

export type AllocItem = { id: string; qty: number; unitCost: number; priority: number };
export type Allocation = { id: string; fundedQty: number; cost: number; deferredQty: number };

/**
 * Cash-aware allocation: fund the most urgent items first (highest priority).
 * If an item doesn't fully fit, fund as many whole units as the remaining budget allows.
 */
export function allocateBudget(items: AllocItem[], budget: number): { allocations: Allocation[]; spent: number; remaining: number } {
  let remaining = Math.max(0, budget);
  const sorted = [...items].sort((a, b) => b.priority - a.priority);
  const allocations = sorted.map((it) => {
    const affordable = it.unitCost > 0 ? Math.floor(remaining / it.unitCost) : it.qty;
    const fundedQty = Math.min(it.qty, affordable);
    const cost = fundedQty * it.unitCost;
    remaining -= cost;
    return { id: it.id, fundedQty, cost, deferredQty: it.qty - fundedQty };
  });
  return { allocations, spent: Math.max(0, budget) - remaining, remaining };
}

/** Urgency: how many days the stock runs short of the lead time. Out-of-stock with demand is most urgent. */
export function urgency(onHand: number, avgDaily: number, leadDays: number) {
  if (avgDaily <= 0) return onHand <= 0 ? 0 : -999;
  return leadDays - onHand / avgDaily;
}
