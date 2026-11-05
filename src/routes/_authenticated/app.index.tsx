import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, Building2, PackageX, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWorkspace } from "@/lib/workspace";
import { loadStock } from "@/lib/stock";
import { formatBDT, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Overview — NexusIQ" }, { name: "description", content: "Your stock, risk and purchasing overview." }, { property: "og:title", content: "Overview — NexusIQ" }, { property: "og:description", content: "Your stock, risk and purchasing overview." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Overview,
});

function Overview() {
  const { company, userName } = useWorkspace();
  const q = useQuery({ queryKey: ["overview", company?.id], enabled: !!company, queryFn: () => loadStock(company!.id) });
  const rows = q.data?.rows ?? [];
  const cur = company?.currency;
  const value = rows.reduce((a, r) => a + r.value, 0);
  const low = rows.filter((r) => r.status === "low");
  const out = rows.filter((r) => r.status === "out");
  const byCat = Object.entries(rows.reduce<Record<string, number>>((m, r) => { const k = r.category || "Uncategorised"; m[k] = (m[k] ?? 0) + r.value; return m; }, {}))
    .map(([name, v]) => ({ name, value: Math.round(v) })).sort((a, b) => b.value - a.value).slice(0, 8);
  const attention = [...out, ...low].slice(0, 6);

  const kpis = [
    { label: "Stock value", value: formatBDT(value, cur), icon: Wallet, tone: "text-primary" },
    { label: "Products tracked", value: formatNumber(rows.length), icon: Boxes, tone: "text-chart-2" },
    { label: "Need reorder", value: formatNumber(low.length), icon: AlertTriangle, tone: "text-warning" },
    { label: "Out of stock", value: formatNumber(out.length), icon: PackageX, tone: "text-destructive" },
    { label: "Suppliers", value: formatNumber(q.data?.supplierCount), icon: Building2, tone: "text-chart-2" },
  ];

  return (
    <>
      <PageHeader title={`Good to see you${userName ? ", " + userName.split(" ")[0] : ""}`} description={`${company?.name} · ${company?.business_type ?? ""}${company?.monthly_budget ? " · Monthly budget " + formatBDT(company.monthly_budget, cur) : ""}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">{k.label}<k.icon className={"h-4 w-4 " + k.tone} /></div>
            <div className="tabular mt-2 text-2xl font-medium">{q.isLoading ? "…" : k.value}</div>
          </div>
        ))}
      </div>

      {!q.isLoading && rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Let's get your data in</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Add suppliers and products, then set stock levels. The dashboard fills in from real numbers — nothing here is made up.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild variant="outline"><Link to="/app/suppliers">Add suppliers</Link></Button>
            <Button asChild><Link to="/app/products">Add products</Link></Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          <div className="rounded-xl border bg-card p-5 shadow-card lg:col-span-3">
            <h2 className="text-sm font-semibold">Stock value by category</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <BarChart data={byCat}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => formatBDT(v, cur)} width={80} />
                  <Tooltip formatter={(v: number) => formatBDT(v, cur)} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-card lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Needs attention</h2>
              <Link to="/app/inventory" className="text-xs text-primary hover:underline">View inventory</Link>
            </div>
            <ul className="mt-3 divide-y">
              {attention.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">All products above their reorder point.</li>}
              {attention.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0"><div className="truncate font-medium">{r.name}</div><div className="tabular text-xs text-muted-foreground">{formatNumber(r.onHand)} on hand · reorder at {formatNumber(r.reorder_point)}</div></div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
