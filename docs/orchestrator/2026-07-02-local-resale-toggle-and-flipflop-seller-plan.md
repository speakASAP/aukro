# 2026-07-02 Local Resale Toggle and FlipFlop Seller Catalog Plan

## Vision
Every authenticated ecosystem user can work with catalog products in e-commerce personal cabinets, including own products, Alfares/company products, and products published by other users for resale.

## Goal Impact
- Allegro, Heureka, and Aukro expose local resale mutation controls instead of only routing users to central Catalog settings.
- Catalog Dashboard and Settings remain the shared contract surface for selecting Alfares/company and community/user product sources.
- FlipFlop becomes a logged-in seller-capable marketplace surface where users can sell own products and sourced Alfares/community products.

## System
- Central product/source contract: catalog-microservice.
- Marketplace personal cabinet surfaces: allegro, heureka, aukro, flipflop.
- Auth source: bearer tokens from authenticated user sessions, forwarded to Catalog for owner-scoped mutations.

## Feature Requirements
1. Local resale mutation toggle:
   - Allegro dashboard lets authenticated users toggle resale publication for Catalog products they own.
   - Heureka dashboard lets authenticated users toggle resale publication for Catalog products they own.
   - Aukro dashboard lets authenticated users toggle resale publication for Catalog products they own.
   - Non-owner products may be visible/selectable for resale where Catalog allows, but owner-only resaleEnabled mutation must be rejected or disabled by the owner guard.
2. Central Catalog source options:
   - User can include own products.
   - User can include Alfares/company products.
   - User can include community/other-user products.
   - User can create or import own product data.
3. FlipFlop seller marketplace:
   - Logged-in users can open a seller/catalog dashboard on FlipFlop.
   - They can browse/select own, Alfares, and community Catalog products.
   - They can publish selected Catalog products to FlipFlop storefront availability.
   - They can publish own products for resale/community usage through the Catalog contract where available.

## Tasks
- Catalog: verify and, if needed, polish central source/resale controls and document validation evidence.
- Allegro: add local resaleEnabled mutation control with authenticated Catalog update path.
- Heureka: add local resaleEnabled mutation control with authenticated Catalog update path.
- Aukro: add local resaleEnabled mutation control with authenticated Catalog update path.
- FlipFlop: add seller dashboard/API flow for logged-in catalog source selection and FlipFlop publication.
- Validation: targeted builds/tests per repo, then commit/push/deploy all touched repos, including pre-existing remote changes as explicitly requested by the user.

## Execution Plan
1. Inspect current code and dirty worktrees on alfares only.
2. Preserve current unrelated changes; do not reset or discard them.
3. Apply scoped implementation in each repo.
4. Validate exact changed surfaces with targeted tests/builds/smokes.
5. Commit all tracked/untracked changes in each touched repo with clear messages.
6. Push each repo to origin.
7. Deploy changed services using ./scripts/deploy.sh when present.
8. Record validation/deploy evidence in reports/validation or repo-local orchestration docs.

## Parallel Execution
| Workstream | Status | Owner | Scope | Forbidden Files | Dependencies | Expected Output | Validation Owner | Merge Order |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Catalog verification | ready now | Orchestrator | catalog dashboard/settings docs/tests | destructive schema changes | none | evidence that source/resale controls exist or patch if missing | Orchestrator | 1 |
| Allegro local toggle | ready now | Worker Allegro | Allegro frontend/API/catalog client | other repos | Catalog owner update endpoint | local resale toggle + validation | Worker/Orchestrator | 2 |
| Heureka local toggle | ready now | Worker Heureka | Heureka dashboard/service/catalog client | other repos | Catalog owner update endpoint | local resale toggle + validation | Worker/Orchestrator | 3 |
| Aukro local toggle | ready now | Worker Aukro | Aukro UI/service/catalog client | other repos | Catalog owner update endpoint | local resale toggle + validation | Worker/Orchestrator | 4 |
| FlipFlop seller surface | ready now | Worker FlipFlop | FlipFlop frontend/product-service seller catalog | other repos | Catalog effective products and publish contract | logged-in seller dashboard/API flow | Worker/Orchestrator | 5 |
| Integration commit deploy | final integration | Orchestrator | all touched repos | destructive reset/clean | completed implementation + validation | commits, pushes, deploy evidence | Orchestrator | final |

## Coding Prompt
Use authenticated bearer token forwarding for user-scoped Catalog reads and owner-only resaleEnabled updates. Prefer existing Catalog DTO/client methods and UI conventions. Do not create app-local product ownership semantics that contradict Catalog; if missing, mark [MISSING: ...] in validation. Keep dirty worktree changes and commit/push all changes as explicitly requested for this task.

## Validation Targets
- git diff --check in each touched repo.
- Existing targeted unit/build commands found in each repo.
- Route/API smoke for dashboards after deploy where routes are public or token-independent.
- Capture blockers as [MISSING: ...] or [UNKNOWN: ...] instead of inventing contracts.
