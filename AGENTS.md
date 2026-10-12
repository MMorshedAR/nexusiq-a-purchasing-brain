<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Multi-tenant data: every business table has company_id and RLS via is_company_member/can_edit_company security-definer functions — keeps workspaces isolated.
- Company creation runs through the create_company RPC (pending signup data held in user metadata until first sign-in) — email confirmation means no session at signup.
- App pages live under src/routes/_authenticated/app.*; unbuilt sidebar items render via app.$section with a "not available yet" state — no fake actions.
