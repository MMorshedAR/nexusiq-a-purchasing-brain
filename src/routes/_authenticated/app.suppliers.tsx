import { createFileRoute } from "@tanstack/react-router";
import { EntityManager } from "@/components/entity-manager";

export const Route = createFileRoute("/_authenticated/app/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — NexusIQ" }, { name: "description", content: "Manage the suppliers you buy from." }, { property: "og:title", content: "Suppliers — NexusIQ" }, { property: "og:description", content: "Manage the suppliers you buy from." }] }),
  component: () => (
    <EntityManager
      table="suppliers" title="Suppliers" singular="Supplier" description="Everyone you buy from, with lead times and terms."
      searchKeys={["name", "contact_name", "email", "country"]}
      fields={[
        { key: "name", label: "Supplier name", required: true, full: true },
        { key: "contact_name", label: "Contact person" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email", type: "email" },
        { key: "country", label: "Country" },
        { key: "lead_time_days", label: "Lead time (days)", type: "number" },
        { key: "payment_terms", label: "Payment terms", placeholder: "Net 30" },
      ]}
      columns={[
        { key: "name", label: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
        { key: "contact_name", label: "Contact" },
        { key: "phone", label: "Phone" },
        { key: "country", label: "Country" },
        { key: "lead_time_days", label: "Lead time", align: "right", render: (r) => `${r.lead_time_days} d` },
        { key: "payment_terms", label: "Terms" },
      ]}
    />
  ),
});
