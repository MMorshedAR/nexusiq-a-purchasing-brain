export type ImportKind = "products" | "suppliers" | "inventory" | "sales";
export type FieldDef = { key: string; label: string; required?: boolean; type?: "number" | "int" | "date" | "text"; aliases: string[] };

export const importDefs: Record<ImportKind, { label: string; help: string; fields: FieldDef[] }> = {
  products: {
    label: "Products", help: "One row per product. Existing SKUs are updated.",
    fields: [
      { key: "sku", label: "SKU", required: true, aliases: ["sku", "code", "item code", "product code"] },
      { key: "name", label: "Name", required: true, aliases: ["name", "product", "product name", "item", "description"] },
      { key: "category", label: "Category", aliases: ["category", "group"] },
      { key: "unit", label: "Unit", aliases: ["unit", "uom"] },
      { key: "unit_cost", label: "Unit cost", type: "number", aliases: ["cost", "unit cost", "purchase price", "buy price"] },
      { key: "sell_price", label: "Sell price", type: "number", aliases: ["price", "sell price", "selling price", "mrp"] },
      { key: "supplier", label: "Supplier name", aliases: ["supplier", "vendor"] },
      { key: "lead_time_days", label: "Lead time (days)", type: "int", aliases: ["lead time", "lead_time", "lead days"] },
      { key: "reorder_point", label: "Reorder point", type: "int", aliases: ["reorder point", "reorder", "rop", "min"] },
    ],
  },
  suppliers: {
    label: "Suppliers", help: "One row per supplier. Matched by name.",
    fields: [
      { key: "name", label: "Name", required: true, aliases: ["name", "supplier", "vendor", "company"] },
      { key: "contact_name", label: "Contact", aliases: ["contact", "contact name", "person"] },
      { key: "phone", label: "Phone", aliases: ["phone", "mobile"] },
      { key: "email", label: "Email", aliases: ["email", "e-mail"] },
      { key: "country", label: "Country", aliases: ["country"] },
      { key: "lead_time_days", label: "Lead time (days)", type: "int", aliases: ["lead time", "lead days"] },
      { key: "payment_terms", label: "Payment terms", aliases: ["terms", "payment terms"] },
    ],
  },
  inventory: {
    label: "Stock levels", help: "Sets the on-hand quantity per SKU and warehouse (replaces current value).",
    fields: [
      { key: "sku", label: "SKU", required: true, aliases: ["sku", "code", "item code"] },
      { key: "quantity", label: "Quantity", required: true, type: "int", aliases: ["quantity", "qty", "stock", "on hand"] },
      { key: "warehouse", label: "Warehouse name", aliases: ["warehouse", "location", "store"] },
    ],
  },
  sales: {
    label: "Sales history", help: "Daily units sold per SKU. Used for forecasts and reorder points.",
    fields: [
      { key: "date", label: "Date", required: true, type: "date", aliases: ["date", "sale date", "day"] },
      { key: "sku", label: "SKU", required: true, aliases: ["sku", "code", "item code"] },
      { key: "quantity", label: "Quantity sold", required: true, type: "int", aliases: ["quantity", "qty", "units", "sold"] },
    ],
  },
};

const norm = (s: string) => s.toLowerCase().replace(/[_\-.]+/g, " ").trim();

export function autoMap(headers: string[], fields: FieldDef[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of fields) {
    const h = headers.find((h) => f.aliases.includes(norm(h)) || norm(h) === norm(f.label));
    if (h) map[f.key] = h;
  }
  return map;
}

/** Parses a cell as a date (ISO string, dd/mm/yyyy, or Excel serial). Returns YYYY-MM-DD or null. */
export function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(+v)) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return null;
}

export type Validated = { row: number; values: Record<string, any>; errors: string[] };

export function validateRows(raw: Record<string, unknown>[], fields: FieldDef[], map: Record<string, string>): Validated[] {
  return raw.map((r, i) => {
    const values: Record<string, any> = {};
    const errors: string[] = [];
    for (const f of fields) {
      const col = map[f.key];
      const v = col ? r[col] : undefined;
      const empty = v === undefined || v === null || String(v).trim() === "";
      if (empty) { if (f.required) errors.push(`${f.label} is missing`); continue; }
      if (f.type === "number" || f.type === "int") {
        const n = Number(String(v).replace(/[,৳\s]/g, ""));
        if (!isFinite(n) || n < 0) errors.push(`${f.label} must be a non-negative number`);
        else values[f.key] = f.type === "int" ? Math.round(n) : n;
      } else if (f.type === "date") {
        const d = parseDate(v);
        if (!d) errors.push(`${f.label} is not a valid date`); else values[f.key] = d;
      } else values[f.key] = String(v).trim();
    }
    return { row: i + 2, values, errors };
  });
}
