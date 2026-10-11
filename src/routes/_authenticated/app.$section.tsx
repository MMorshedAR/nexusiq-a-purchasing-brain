import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { allNav } from "@/lib/nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/$section")({
  beforeLoad: ({ params }) => {
    if (!allNav.some((n) => n.slug === params.section && n.phase)) throw notFound();
  },
  head: ({ params }) => {
    const item = allNav.find((n) => n.slug === params.section);
    const t = `${item?.label ?? "Page"} — NexusIQ`;
    return { meta: [{ title: t }, { name: "description", content: item?.blurb ?? "" }, { property: "og:title", content: t }, { property: "og:description", content: item?.blurb ?? "" }] };
  },
  component: Upcoming,
});

function Upcoming() {
  const { section } = Route.useParams();
  const item = allNav.find((n) => n.slug === section)!;
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground"><item.icon /></div>
      <h1 className="mt-5 text-2xl font-semibold">{item.label}</h1>
      <p className="mt-2 text-muted-foreground">{item.blurb}</p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
        <Construction className="h-3.5 w-3.5" /> Not available yet · planned for phase {item.phase}
      </div>
      <div className="mt-8"><Button asChild variant="outline"><Link to="/app/products">Manage products meanwhile</Link></Button></div>
    </div>
  );
}
