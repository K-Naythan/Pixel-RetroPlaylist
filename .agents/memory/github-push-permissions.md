---
name: GitHub push permissions
description: A successful GitHub token login does not guarantee write access to the target repository.
---

A GitHub token can authenticate successfully while lacking permission to push to the target repository. Repository-scoped tokens need Contents: Read and write access; classic tokens need the appropriate `repo` scope.

**Why:** A token authenticated as the repository owner but was initially denied push access; retrying after correcting its write permission succeeded.

**How to apply:** If GitHub returns 403 during push, keep the token private and ask the user to update it through the secrets flow with target-repository write access.
