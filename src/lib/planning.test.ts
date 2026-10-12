import { describe, it, expect } from "vitest";
import { allocateBudget, dailySeries, eoq, forecast, reorderPoint, safetyStock, suggestedQty } from "./planning";

describe("planning", () => {
  it("buckets sales by day", () => {
    const s = dailySeries([{ sale_date: "2026-10-10", quantity: 3 }, { sale_date: "2026-10-12", quantity: 5 }, { sale_date: "2026-09-01", quantity: 9 }], 3, new Date("2026-10-12T00:00:00Z"));
    expect(s).toEqual([3, 0, 5]);
  });
  it("flat demand forecasts the average", () => {
    const f = forecast(new Array(60).fill(10), 30);
    expect(f.avgDaily).toBe(10);
    expect(Math.round(f.total)).toBe(300);
  });
  it("safety stock 1.65·σ·√L", () => expect(safetyStock(4, 9)).toBe(20));
  it("reorder point = avg·L + SS", () => expect(reorderPoint(10, 7, 20)).toBe(90));
  it("EOQ √(2DS/H)", () => expect(eoq(3650, 500, 10)).toBe(605));
  it("no order when above reorder point", () => expect(suggestedQty({ onHand: 100, onOrder: 0, rop: 90, avgDaily: 10, eoq: 50 })).toBe(0));
  it("order up to ROP + 30 days cover", () => expect(suggestedQty({ onHand: 50, onOrder: 10, rop: 90, avgDaily: 10, eoq: 50 })).toBe(330));
  it("funds most urgent first and partially funds the rest", () => {
    const r = allocateBudget([
      { id: "a", qty: 10, unitCost: 100, priority: 1 },
      { id: "b", qty: 10, unitCost: 50, priority: 5 },
    ], 1000);
    expect(r.allocations.find((x) => x.id === "b")!.fundedQty).toBe(10);
    expect(r.allocations.find((x) => x.id === "a")!.fundedQty).toBe(5);
    expect(r.remaining).toBe(0);
  });
});
