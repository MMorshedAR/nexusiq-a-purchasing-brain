import {
  LayoutDashboard, BrainCircuit, TrendingUp, ShoppingCart, Boxes, Truck, ShieldAlert, Wallet, PiggyBank,
  Package, Building2, Warehouse, FileText, Upload, BarChart3, Users, Plug, CreditCard, Settings, LifeBuoy, History,
  type LucideIcon,
} from "lucide-react";

export type NavPath =
  | "/app"
  | "/app/command-center"
  | "/app/forecasts"
  | "/app/reorder"
  | "/app/inventory"
  | "/app/supplier-intelligence"
  | "/app/risk-lab"
  | "/app/cash-flow"
  | "/app/savings"
  | "/app/products"
  | "/app/suppliers"
  | "/app/warehouses"
  | "/app/purchase-orders"
  | "/app/import"
  | "/app/reports"
  | "/app/activity"
  | "/app/team"
  | "/app/integrations"
  | "/app/billing"
  | "/app/settings"
  | "/app/help";
export type NavItem = { slug: string; to: NavPath; label: string; icon: LucideIcon; phase?: number; blurb?: string };
export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  { label: "Intelligence", items: [
    { slug: "", to: "/app", label: "Overview", icon: LayoutDashboard },
    { slug: "command-center", to: "/app/command-center", label: "AI Command Center", icon: BrainCircuit, blurb: "Ask Nexus AI about your stock, suppliers and cash." },
    { slug: "forecasts", to: "/app/forecasts", label: "Demand Forecasts", icon: TrendingUp },
    { slug: "reorder", to: "/app/reorder", label: "Smart Reorder Planner", icon: ShoppingCart },
    { slug: "inventory", to: "/app/inventory", label: "Inventory Intelligence", icon: Boxes },
    { slug: "supplier-intelligence", to: "/app/supplier-intelligence", label: "Supplier Intelligence", icon: Truck },
    { slug: "risk-lab", to: "/app/risk-lab", label: "Risk & Disruption Lab", icon: ShieldAlert },
    { slug: "cash-flow", to: "/app/cash-flow", label: "Cash Flow Optimizer", icon: Wallet },
    { slug: "savings", to: "/app/savings", label: "Savings & Impact", icon: PiggyBank },
  ]},
  { label: "Operations", items: [
    { slug: "products", to: "/app/products", label: "Products", icon: Package },
    { slug: "suppliers", to: "/app/suppliers", label: "Suppliers", icon: Building2 },
    { slug: "warehouses", to: "/app/warehouses", label: "Warehouses", icon: Warehouse },
    { slug: "purchase-orders", to: "/app/purchase-orders", label: "Purchase Orders", icon: FileText },
    { slug: "import", to: "/app/import", label: "Data Import Center", icon: Upload },
    { slug: "reports", to: "/app/reports", label: "Reports & Analytics", icon: BarChart3, blurb: "Exportable reports across stock, purchases and suppliers." },
  ]},
  { label: "Workspace", items: [
    { slug: "activity", to: "/app/activity", label: "Activity log", icon: History },
    { slug: "team", to: "/app/team", label: "Team & Permissions", icon: Users, blurb: "Invite teammates and assign roles." },
    { slug: "integrations", to: "/app/integrations", label: "Integrations", icon: Plug, blurb: "Connections to accounting and e-commerce tools." },
    { slug: "billing", to: "/app/billing", label: "Billing & Plans", icon: CreditCard, blurb: "Starter ৳1,000 · Growth ৳5,000 · Enterprise ৳20,000 per month." },
    { slug: "settings", to: "/app/settings", label: "Company Settings", icon: Settings, blurb: "Company profile, currency, budget and preferences." },
    { slug: "help", to: "/app/help", label: "Help", icon: LifeBuoy, blurb: "Guides and support." },
  ]},
];

export const allNav = navGroups.flatMap((g) => g.items);
