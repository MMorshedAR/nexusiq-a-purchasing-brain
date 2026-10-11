export function formatBDT(value: number | null | undefined, currency = "BDT") {
  const n = Number(value ?? 0);
  const symbol = currency === "BDT" ? "৳" : currency + " ";
  return symbol + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export type StockStatus = "out" | "low" | "ok";
/** Out = 0 on hand; Low = at or below reorder point; otherwise OK. */
export function stockStatus(onHand: number, reorderPoint: number): StockStatus {
  if (onHand <= 0) return "out";
  if (onHand <= reorderPoint) return "low";
  return "ok";
}
