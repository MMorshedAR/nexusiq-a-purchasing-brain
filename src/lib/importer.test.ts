import { describe, it, expect } from "vitest";
import { autoMap, importDefs, parseDate, validateRows } from "./importer";

describe("importer", () => {
  it("auto-maps common headers", () => {
    expect(autoMap(["Item Code", "Qty", "Date"], importDefs.sales.fields)).toEqual({ sku: "Item Code", quantity: "Qty", date: "Date" });
  });
  it("parses dd/mm/yyyy as day-first", () => expect(parseDate("05/03/2026")).toBe("2026-03-05"));
  it("parses Excel serial dates", () => expect(parseDate(46023)).toBe("2026-01-01"));
  it("flags missing and negative values", () => {
    const [r] = validateRows([{ Date: "2026-01-01", SKU: "", Qty: "-3" }], importDefs.sales.fields, { date: "Date", sku: "SKU", quantity: "Qty" });
    expect(r!.errors).toEqual(["SKU is missing", "Quantity sold must be a non-negative number"]);
  });
  it("strips taka symbol and commas", () => {
    const [r] = validateRows([{ c: "৳1,250" , s: "A", n: "X"}], importDefs.products.fields, { unit_cost: "c", sku: "s", name: "n" });
    expect(r!.values["unit_cost"]).toBe(1250);
  });
});
