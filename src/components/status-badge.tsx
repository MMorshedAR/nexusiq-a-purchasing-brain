import type { StockStatus } from "@/lib/format";

const map: Record<StockStatus, { label: string; cls: string }> = {
  out: { label: "Out of stock", cls: "bg-destructive/10 text-destructive" },
  low: { label: "Reorder", cls: "bg-warning/20 text-warning-foreground" },
  ok: { label: "Healthy", cls: "bg-success/10 text-success" },
};
export function StatusBadge({ status }: { status: StockStatus }) {
  const m = map[status];
  return <span className={"inline-flex rounded-full px-2 py-0.5 text-xs font-medium " + m.cls}>{m.label}</span>;
}
