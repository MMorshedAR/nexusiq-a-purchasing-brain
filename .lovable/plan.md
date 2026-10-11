# NexusIQ — Build Plan

The brief is very large (20 pages, roles, billing, AI, imports). It will be built in phases, each one fully working before the next.

## Phase 1 — Foundation (P0, this turn)
- Turn on Lovable Cloud: secure sign-in, company registration (name, slug, admin, business type, country, BDT currency, budget), forgot/reset password.
- Company workspaces with strict data isolation; creator becomes Owner.
- Design system: midnight navy sidebar, off-white canvas, teal/amber/red status colors, BDT (৳) formatting.
- App shell: collapsible sidebar with all 20 items, top bar (search, Ctrl+K palette, notifications, profile, Upload Data, Ask Nexus AI). Not-yet-built pages show a clear "coming in next phase" state, no fake actions.
- Public landing page with tagline and Sign in / Create account.
- Real CRUD: Products, Suppliers, Warehouses, Inventory levels.
- Overview dashboard with KPIs computed from real data (stock value, low-stock items, stockout risk, supplier count).

## Phase 2 — Intelligence core
- CSV/Excel Data Import Center with column mapping and validation.
- Demand forecasting baseline (moving average + trend from sales history).
- Smart Reorder Planner (safety stock, reorder point, EOQ) and cash-aware optimizer within budget.
- Purchase Orders lifecycle (draft → approved → received, updates stock).

## Phase 3 — Differentiators (P1)
- Supplier Intelligence scoring, Risk & Disruption Lab simulations, Cash Flow Optimizer, Savings & Impact, recommendation explanations, notifications and audit history.

## Phase 4 — SaaS (P2)
- Team invites and role permissions, reports/exports, English/Bangla toggle, billing plans (৳1,000 / ৳5,000 / ৳20,000), integrations page, Nexus AI assistant via Lovable AI.

## Technical details
- TanStack Start routes under `_authenticated/` for the app; public `/`, `/auth`, `/register`, `/reset-password`.
- Tables: companies, company_members (role enum, separate table), products, suppliers, warehouses, inventory, sales_history, purchase_orders, po_items, audit_log; RLS via `is_company_member()` security-definer function.
- Unit tests for reorder-point / EOQ / budget-allocation math.
