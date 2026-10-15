import {
  LayoutDashboard, BrainCircuit, TrendingUp, ShoppingCart, Boxes, Truck, ShieldAlert, Wallet, PiggyBank,
  Package, Building2, Warehouse, FileText, Upload, BarChart3, Users, Plug, CreditCard, Settings, LifeBuoy, History,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { slug: string; label: string; icon: LucideIcon; phase?: number; blurb?: string };
export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  { label: "Intelligence", items: [
    { slug: "", label: "Overview", icon: LayoutDashboard },
    { slug: "command-center", label: "AI Command Center", icon: BrainCircuit, phase: 4, blurb: "Ask Nexus AI about your stock, suppliers and cash." },
    { slug: "forecasts", label: "Demand Forecasts", icon: TrendingUp },
    { slug: "reorder", label: "Smart Reorder Planner", icon: ShoppingCart },
    { slug: "inventory", label: "Inventory Intelligence", icon: Boxes },
    { slug: "supplier-intelligence", label: "Supplier Intelligence", icon: Truck },
    { slug: "risk-lab", label: "Risk & Disruption Lab", icon: ShieldAlert },
    { slug: "cash-flow", label: "Cash Flow Optimizer", icon: Wallet },
    { slug: "savings", label: "Savings & Impact", icon: PiggyBank },
  ]},
  { label: "Operations", items: [
    { slug: "products", label: "Products", icon: Package },
    { slug: "suppliers", label: "Suppliers", icon: Building2 },
    { slug: "warehouses", label: "Warehouses", icon: Warehouse },
    { slug: "purchase-orders", label: "Purchase Orders", icon: FileText },
    { slug: "import", label: "Data Import Center", icon: Upload },
    { slug: "reports", label: "Reports & Analytics", icon: BarChart3, phase: 4, blurb: "Exportable reports across stock, purchases and suppliers." },
  ]},
  { label: "Workspace", items: [
    { slug: "activity", label: "Activity log", icon: History },
    { slug: "team", label: "Team & Permissions", icon: Users, phase: 4, blurb: "Invite teammates and assign roles." },
    { slug: "integrations", label: "Integrations", icon: Plug, phase: 4, blurb: "Connections to accounting and e-commerce tools." },
    { slug: "billing", label: "Billing & Plans", icon: CreditCard, phase: 4, blurb: "Starter ৳1,000 · Growth ৳5,000 · Enterprise ৳20,000 per month." },
    { slug: "settings", label: "Company Settings", icon: Settings, phase: 4, blurb: "Company profile, currency, budget and preferences." },
    { slug: "help", label: "Help", icon: LifeBuoy, phase: 4, blurb: "Guides and support." },
  ]},
];

export const allNav = navGroups.flatMap((g) => g.items);
