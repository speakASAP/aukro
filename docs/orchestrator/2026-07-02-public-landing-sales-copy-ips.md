# Public landing sales copy IPS note

Vision -> customers can understand that Alfares marketplace services let them sell discounted Alfares/company supplier products, their own products, and available products from other users or the shared catalog.
Goal Impact -> public Aukro landing copy states the sales model and the automation/customer responsibility split before users enter the dashboard.
System -> aukro public server-rendered landing page.
Feature -> marketplace sales-source and automation copy for Aukro.
Task -> update landing copy only; avoid deploy.
Execution Plan -> inspect dirty worktree, edit the landing shell copy, validate syntax/build surface without touching unrelated files.
Coding Prompt -> remote worker prompt dated 2026-07-02 for allegro/aukro/bazos landing sales copy.
Code -> services/aukro-service/src/ui/ui.controller.ts.
Validation -> git diff --check passed; npm --prefix services/aukro-service run build passed.
