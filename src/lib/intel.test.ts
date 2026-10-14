import { describe, it, expect } from "vitest";
import { projectCash, riskBand, scoreSupplier, simulate } from "./intel";

describe("intel", () => {
  it("scores a perfect supplier 100", () => {
    const r = scoreSupplier([{ order_date: "2026-01-01", expected_date: "2026-01-08", received_at: "2026-01-08T10:00:00Z", status: "received", value: 1000 }], 7);
    expect(r.score).toBe(100);
    expect(riskBand(r.score)).toBe("low");
  });
  it("penalises late, slow deliveries", () => {
    const r = scoreSupplier([{ order_date: "2026-01-01", expected_date: "2026-01-08", received_at: "2026-01-15", status: "received", value: 1 }], 7);
    expect(r.onTimeRate).toBe(0);
    expect(r.score).toBe(0);
  });
  it("no history means unknown", () => expect(scoreSupplier([], 7).score).toBeNull());
  it("delay causes stockout beyond cover", () => {
    const s = simulate([{ id: "a", onHand: 50, onOrder: 0, avgDaily: 10, leadDays: 7, unitCost: 10, sellPrice: 20, supplierId: "x" }],
      { delayDays: 5, supplierId: "x", demandPct: 0, pricePct: 10, horizon: 30 });
    expect(s.rows[0]!.stockoutDays).toBe(7);
    expect(s.lostRevenue).toBe(1400);
    expect(s.extraCost).toBe(300);
  });
  it("projects weekly balance", () => {
    const p = projectCash(1000, 100, [{ date: "2026-01-10", amount: 500, label: "PO" }], 2, new Date("2026-01-01T00:00:00Z"));
    expect(p.map((x) => x.balance)).toEqual([1100, 700]);
  });
});
