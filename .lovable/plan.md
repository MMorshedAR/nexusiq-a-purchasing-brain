# Company and Branch Management Upgrade

## Goal
Extend NexusIQ with secure company profiles, separate branches, branch-scoped administrators, people records, payroll and real branch monitoring. Preserve the current purchasing, inventory, forecasting and AI workflows.

## Implementation
1. **Company profile and branch foundation**
   - Add optional company contact/legal details and logo upload while retaining existing company settings.
   - Create branches as distinct records from warehouses. Link warehouses and branch-level operations to branches additively; preserve existing records and explicitly leave ambiguous legacy sales unattributed.
   - Add company-owned branch membership and secure invite assignment. Keep company Owners separate from branch-admin permissions.
2. **Branch operations and access controls**
   - Apply database-enforced, branch-scoped access to branch inventory, purchase orders, sales, and activity. Keep existing company-wide access intact for Owners and authorized company admins; branch administrators must not inherit it.
   - Add branch directory/detail views, assignment management, and branch filters; retain the existing warehouse workflows.
   - Record actual sales amounts through a branch-linked transaction flow and update stock atomically. Do not infer monetary sales from quantity-only history.
3. **People and payroll**
   - Add manager/employee records with optional account links, branch assignments, employment status and decimal salary components.
   - Add monthly payroll records with duplicate-period protection, salary history, filters and printable/downloadable salary slips. Mark manual payment entries clearly; no payment integration or claim of external payment.
   - Restrict salary data to company Owners and assigned branch administrators in both database policies and screens; managers and employees cannot view payroll by default.
4. **Company and branch dashboards**
   - Add company profile, owner dashboard, branch monitoring, and individual branch dashboards using persisted records only.
   - Provide date/branch filters and sales, inventory, purchasing, people and activity summaries where source data exists. Empty or unavailable metrics remain clearly empty rather than fabricated.
   - Add branch-aware immutable audit records and owner/admin-scoped activity views.
5. **Validation**
   - Add concrete tests for salary calculations and duplicate payroll periods, plus security/data-access checks where the project’s test setup permits.
   - Verify migrations and preview build, then exercise profile updates, branch creation, invitations, branch isolation, payroll permissions and sales-to-stock updates. Report any flow blocked by needing a second account or external email delivery.

## Technical details
- Use additive Lovable Cloud migrations with explicit grants and RLS; use the existing authenticated invite flow rather than password creation or privileged client-side account creation.
- Existing `company_members` roles currently grant company-wide access, so branch admins must be represented and checked separately; hiding navigation is not a security boundary.
- Existing sales history stores quantities only. New monetary sales reporting will use recorded transactions; legacy rows are not assigned to a branch without reliable source data.
- Use a dedicated private/appropriately scoped storage bucket for company logos, and preserve company isolation for uploads.
- Branches remain separate from warehouses, as chosen; warehouse stock locations can be associated with a branch without replacing them.
