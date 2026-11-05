import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadStock } from "@/lib/stock";
import { Bell, Building2, Check, ChevronsUpDown, Languages, LogOut, Search, Sparkles, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace";
import { navGroups, allNav } from "@/lib/nav";
import { Logo } from "@/components/brand";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LanguageProvider, useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app")({
  component: () => (
    <WorkspaceProvider>
      <LanguageProvider><Shell /></LanguageProvider>
    </WorkspaceProvider>
  ),
});

function Shell() {
  const { company, loading } = useWorkspace();
  const { language, setLanguage, t } = useLanguage();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [cmd, setCmd] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((o) => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!loading && !company) return <NoWorkspace />;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 py-4"><Link to="/app"><Logo className="text-sidebar-accent-foreground" /></Link></SidebarHeader>
        <SidebarContent>
          {navGroups.map((g) => (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{t(g.label)}</SidebarGroupLabel>
              <SidebarMenu>
                {g.items.map((it) => {
                  const active = it.slug ? pathname.startsWith(it.to) : pathname === "/app" || pathname === "/app/";
                  return (
                    <SidebarMenuItem key={it.slug}>
                      <SidebarMenuButton asChild isActive={active} tooltip={it.label}>
                        <Link to={it.to}>
                          <it.icon />
                          <span>{t(it.label)}</span>
                          {it.phase && <span className="ml-auto text-[10px] uppercase tracking-wider opacity-50">soon</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur">
          <SidebarTrigger />
          <WorkspaceSwitcher />
          <Button variant="outline" onClick={() => setCmd(true)} className="ml-2 hidden h-9 flex-1 max-w-sm items-center justify-start gap-2 bg-card px-3 text-sm text-muted-foreground md:flex">
            <Search className="h-4 w-4" /> {t("Search pages…")}<kbd className="ml-auto rounded border px-1.5 text-[10px]">Ctrl K</kbd>
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/import" })}><Upload /> <span className="hidden sm:inline">{t("Upload data")}</span></Button>
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app/command-center" })}><Sparkles /> <span className="hidden sm:inline">{t("Ask Nexus AI")}</span></Button>
            <Button variant="ghost" size="icon" aria-label={t("Language")} title={t("Language")} onClick={() => setLanguage(language === "en" ? "bn" : "en")}><Languages /></Button>
            <Notifications />
            <UserMenu />
          </div>
        </header>
        <main className="p-4 md:p-8"><Outlet /></main>
      </SidebarInset>
      <CommandDialog open={cmd} onOpenChange={setCmd}>
        <CommandInput placeholder={t("Jump to…")} />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {allNav.map((it) => (
              <CommandItem key={it.slug} onSelect={() => { setCmd(false); navigate({ to: it.to }); }}>
                <it.icon /> {t(it.label)}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  );
}

function WorkspaceSwitcher() {
  const { memberships, company, switchCompany } = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[220px]"><Building2 /><span className="truncate">{company?.name ?? "…"}</span><ChevronsUpDown className="opacity-50" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {memberships.map((m) => (
          <DropdownMenuItem key={m.company.id} onSelect={() => switchCompany(m.company.id)}>
            {m.company.name} <span className="ml-auto text-xs text-muted-foreground capitalize">{m.role}</span>
            {m.company.id === company?.id && <Check />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Notifications() {
  const { company } = useWorkspace();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["alerts", company?.id], enabled: !!company, refetchInterval: 120000,
    queryFn: async () => {
      const [stock, po] = await Promise.all([
        loadStock(company!.id),
        supabase.from("purchase_orders").select("id, po_number, expected_date").eq("company_id", company!.id).eq("status", "approved").lt("expected_date", new Date().toISOString().slice(0, 10)),
      ]);
      if (po.error) throw po.error;
      const alerts: { key: string; tone: string; text: string; to: string }[] = [];
      for (const r of stock.rows.filter((r) => r.status === "out").slice(0, 5)) alerts.push({ key: "o" + r.id, tone: "bg-destructive", text: `${r.name} is out of stock`, to: "/app/inventory" });
      for (const r of stock.rows.filter((r) => r.status === "low").slice(0, 5)) alerts.push({ key: "l" + r.id, tone: "bg-warning", text: `${r.name} is at its reorder point`, to: "/app/reorder" });
      for (const p of po.data ?? []) alerts.push({ key: "p" + p.id, tone: "bg-warning", text: `${p.po_number} is overdue (expected ${p.expected_date})`, to: "/app/purchase-orders" });
      return alerts;
    },
  });
  const alerts = q.data ?? [];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative"><Bell />
          {alerts.length > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{alerts.length}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-sm">
        <p className="font-medium">{t("Notifications")}</p>
        {q.isLoading ? <p className="mt-2 text-muted-foreground">{t("Loading notifications…")}</p> : q.isError ? <p className="mt-2 text-destructive">{t("Notifications could not be loaded.")}</p> : alerts.length === 0 ? <p className="mt-2 text-muted-foreground">{t("You're all caught up.")}</p> : (
          <ul className="mt-2 divide-y">
            {alerts.map((a) => (
              <li key={a.key}><button className="flex w-full items-start gap-2 py-2 text-left hover:text-primary" onClick={() => navigate({ to: a.to })}>
                <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + a.tone} />{a.text}
              </button></li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const { userEmail, userName, role } = useWorkspace();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const initials = (userName ?? userEmail ?? "?").slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="grid h-8 w-8 place-items-center rounded-full bg-navy text-xs font-semibold text-navy-foreground" aria-label="Account">{initials}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div>{userName ?? "Account"}</div>
            <div className="text-xs font-normal text-muted-foreground">{userEmail} · <span className="capitalize">{role}</span></div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}><LogOut /> {t("Sign out")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NoWorkspace() {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div className="max-w-sm">
        <Logo className="text-lg" />
        <h1 className="mt-6 text-xl font-semibold">No workspace yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account isn't part of any company. Create one to get started.</p>
        <Button className="mt-6" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/register" }); }}>Create a company</Button>
      </div>
    </div>
  );
}
