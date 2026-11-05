import { createFileRoute } from "@tanstack/react-router";
import { EntityManager } from "@/components/entity-manager";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/warehouses")({
  head: () => ({ meta: [{ title: "Warehouses — NexusIQ" }, { name: "description", content: "Manage storage locations." }, { property: "og:title", content: "Warehouses — NexusIQ" }, { property: "og:description", content: "Manage storage locations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => (
    <EntityManager
      table="warehouses" title="Warehouses" singular="Warehouse" description="Where your stock physically sits."
      searchKeys={["name", "location"]}
      fields={[
        { key: "name", label: "Name", required: true, full: true },
        { key: "location", label: "Location", placeholder: "Chattogram" },
        { key: "capacity_units", label: "Capacity (units)", type: "number" },
      ]}
      columns={[
        { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "location", label: "Location" },
        { key: "capacity_units", label: "Capacity", align: "right", render: (r) => (r.capacity_units ? formatNumber(r.capacity_units) : "—") },
      ]}
    />
  ),
});
