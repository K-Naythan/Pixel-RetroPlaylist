---
name: Firebase administrator access
description: Keep client-side administrator accounts aligned with Realtime Database authorization.
---

The client-side administrator allowlist and Realtime Database security rules are separate policy sources. An account can pass the app's admin check and still be denied by Firebase, or the database can grant access to an account the app hides from the admin UI.

**Why:** the imported app's configured admin list and database rules disagreed, so the panel's account check did not match database access.

**How to apply:** when administrator membership changes, update the client allowlist, the database rules, and the admin-facing copy together.
