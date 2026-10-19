---
name: Firebase administrator access
description: Keep client-side administrator accounts aligned with Realtime Database authorization.
---

The administrator panel is entered through the `/admin-painel` chat command. Only the two approved administrator accounts may use that command; the client allowlist and Realtime Database security rules are separate policy sources.

**Why:** the imported app's configured admin list and database rules disagreed, so the panel's account check did not match database access.

**How to apply:** keep command access, the client allowlist, database rules, and admin-facing copy aligned when changing administrators or panel entry behavior.
