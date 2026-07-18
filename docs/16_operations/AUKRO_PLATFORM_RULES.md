---
id: AUKRO-PLATFORM-RULES-001
status: reviewed
owner: Engineering
created: 2026-06-29
last_updated: 2026-06-29
completeness_level: complete
upstream:
  - ../10_features/FEAT-004-aukro-compliance-policy.md
downstream:
  - ../11_tasks/TASK-011-document-aukro-platform-rules.md
related_adrs: []
---
# Aukro Platform Rules And Automation Boundaries

This document is the engineering rulebook for using Aukro from `aukro-service` without violating the platform rules reviewed on 2026-06-29. It is not legal advice; it is the fail-closed product and engineering boundary for automation.

## Official source snapshot

Reviewed sources:

- Aukro terms: `https://aukro.cz/dokumenty/obchodni-podminky` via `https://aukro.cz/docs/obchodni-podminky`.
- Embedded terms document id: `2PACX-1vS8v-1kJ0vr3z-tIMoBpPOfx7AVG9eqiezZBtWmVPh4DOIRz82qva8lF8M4IT90fvMKbbOXbPHBydem`; the rendered document states it is effective from 2025-10-13 and is automatically refreshed.
- Prohibited and conditionally allowed goods: `https://aukro.cz/stranka/zbozi-zakazane-nebo-povolene-podminecne`.
- Privacy rules: `https://aukro.cz/dokumenty/pravidla-ochrany-osobnich-udaju` via `https://aukro.cz/docs/pravidla-ochrany-osobnich-udaju`.
- Cookies: `https://aukro.cz/dokumenty/cookies` via `https://aukro.cz/docs/cookies`.
- Crawler directives: `https://aukro.cz/robots.txt`.

Open source gap: `[MISSING: current public official Aukro WebAPI endpoint, authentication-flow, and per-endpoint rate-limit documentation]`. The terms mention WebAPI, but no current public endpoint documentation was found during this review.

## Decision summary

`aukro-service` may help operators prepare, review, and submit compliant Aukro listings only when all evidence gates pass. It must not scrape Aukro, bypass Aukro controls, overload Aukro infrastructure, manipulate auctions or prices, or post content/goods that violate Aukro rules.

Live marketplace mutation is allowed only through an official Aukro WebAPI/account-key path or explicit Aukro-approved integration evidence. If the WebAPI key is missing, disabled, rate-limit state is unknown, or category/policy risk is uncertain, the service must block publication and route the item to human review.

## Allowed operating model

- Prepare offer drafts from internal catalog, warehouse, pricing, and media systems.
- Use local policy checks, AI advisory checks, and human review before publication.
- Use official Aukro WebAPI only when an active account key, account state, rate-limit budget, idempotency key, and human approval are recorded as fresh evidence.
- Read public Aukro pages only for bounded manual verification or source research, respecting `robots.txt` and without crawler-like collection, replication, or load.
- Store only the minimum marketplace data needed for auditability and reconciliation; mask personal/customer data in logs, tests, AI prompts, and reports.

## Hard prohibitions

Automation must not:

- Reproduce, collect, or copy Aukro content through robots, crawlers, scraping, or similar search/collection mechanisms without explicit Aukro consent.
- Use software, scripts, or automation that disrupts Aukro functions or puts disproportionate load on Aukro systems.
- Bypass, hide, block, modify, or interfere with Aukro page content, platform controls, security, reporting, payment, or transaction flows.
- Manipulate auction results or prices, including self-bidding, artificial price increases, duplicate accounts, fee evasion, wrong-category fee avoidance, or any other unfair advantage.
- Encourage or enable off-platform trading, including external purchase links, direct-sales instructions, or messages intended to move transactions outside Aukro.
- Publish listings for goods that are prohibited, conditionally allowed without the required evidence, illegal, stolen, counterfeit, infringing, hateful, defamatory, or otherwise non-compliant.
- Use copyrighted third-party photos, texts, brands, logos, marks of origin, or protected materials without sufficient rights or consent.
- Put executable or behavior-changing content into listing descriptions, including popups, browser-window opening, dialogs, iframes/objects with other offers, page-element manipulation, or cookie creation.
- Create new accounts or continue trading after a block, suspension, cancellation, or other platform restriction without explicit Aukro consent.

## WebAPI boundary

Aukro terms describe WebAPI as free for users and tied to a special identifying key on the user account. Aukro reserves the right to deny access by disabling that key.

Engineering consequences:

- `accountReady` must include active-account evidence, WebAPI/key evidence, and no known account block or suspension.
- `rateLimitReady` must include a current request budget or other operator-approved evidence. `[MISSING: official numeric rate limits]` means fail closed for live publish automation until resolved.
- WebAPI key disablement, authentication failure, repeated 429/403/401 responses, or unknown API state must stop live mutations immediately.
- Browser automation must not be used as a replacement for WebAPI where it would bypass user-interface controls or mimic prohibited automated activity.

## Listing content rules

Before publication, the generated title, description, media, attributes, and category must be checked for:

- No off-platform sale proposals, external shop links, or direct-contact transaction language.
- No keyword stuffing, misleading titles, brand parasitism, or claims that distort search/category placement.
- No unauthorized photos, text, marks, logos, origin claims, or protected intellectual property.
- No executable page behavior in the description: no automatic browser windows, alert/confirm/prompt dialogs, iframe/object loading, page element movement/blocking/hiding/copying, offer insertion interference, or cookie generation.
- No prohibited or conditionally allowed goods without explicit category-specific evidence.

## Prohibited and conditional goods gate

Aukro maintains a detailed prohibited/conditional-goods page and the terms treat that list as demonstrative, not exhaustive. The rules engine and human review must fail closed for uncertain categories.

High-risk categories include alcohol, drugs, chemicals, medicines and supplements, tobacco/nicotine/smoking goods, weapons/ammunition/explosives/pyrotechnics, pornography/erotic goods, personal data/email lists, computer viruses, counterfeit goods, infringing media/software/licenses, financial products/crypto/stocks, betting/speculator systems, food with expiry or transport restrictions, animals and animal products, archaeological/cultural/art items, Third Reich/hate symbolism, police IDs/badges, goods with the Aukro logo, activation-locked devices, modified consoles, and products of unknown technical condition.

Any item in or near these categories requires explicit policy evidence, category mapping evidence, and human approval. `[UNKNOWN: category-specific Aukro exception]` means do not publish.

## Privacy and cookies

Aukro privacy rules describe automated and manual personal-data processing by Aukro and its processors, and user rights around access, correction, deletion, restriction, objection, and complaints. Our automation must minimize personal-data handling and must not use raw customer/order data for AI prompts, reports, or tests unless a separate lawful basis and masking policy exists.

Aukro cookie rules separate necessary cookies from analytics, advertising, and personalization cookies. Browser-based verification must respect consent/preference controls. Listing descriptions must never generate cookies or insert cookie-setting behavior.

## Robots.txt boundary

The 2026-06-29 `robots.txt` snapshot disallows many transactional or control routes for general crawlers, including registration, account verification, password reset, cart/payment, reporting violations, selling/listing flows, closed pages, and several dynamic offer-list pages. `ClaudeBot` is disallowed entirely.

Robots directives are not the whole legal contract, but they are an engineering hard stop for crawler-like reads. Do not build crawlers over disallowed routes. Do not rely on robots-allowed pages as permission to scrape or reproduce content; the terms still require explicit Aukro consent for robot/crawler content reproduction.

## Catalog Bundle Publication Boundary

Aukro currently treats `catalog.bundle.v1` as unsupported for one external Aukro listing. The Catalog bundle contract uses `pricePolicy=checkout_authoritative` and requires cross-system evidence for component stock reservation, shipping/free-shipping policy, item mapping, and external listing semantics that Aukro does not own today.

Engineering consequence: any Catalog bundle-shaped product or source snapshot must set `catalogBundlePublication` evidence to failed for `publicationMode=single_external_listing`. Operators may create ordinary component listings when each component independently passes Aukro policy, but Aukro must not publish the bundle aggregate as one external listing until an approved channel-specific bundle policy defines price, stock, reservation, shipping, and order reconciliation behavior.

## Evidence gates in code

`OfferPolicyService` must keep these gates fail-closed:

- `catalogValidated`: product is active, sellable, and internally approved.
- `accountReady`: active Aukro account and official WebAPI/key readiness; no block/suspension evidence.
- `categoryMapped`: mapped to an approved Aukro category, with uncertain/high-risk categories blocked.
- `requiredParametersComplete`: all marketplace-required attributes are present and truthful.
- `mediaReady`: media rights are cleared and at least one approved image exists.
- `stockAvailable`: sellable warehouse quantity is present.
- `priceValid`: pricing and margin rules are valid and non-manipulative.
- `duplicateChecked`: duplicate-listing risk is checked.
- `aiRiskCleared`: AI/rules risk checks pass, but AI output cannot override any other failed gate.
- `catalogBundlePublication`: bundle-shaped Catalog input must fail closed for one external Aukro listing unless an approved Aukro bundle policy proves price, stock reservation, shipping, component mapping, and order reconciliation evidence.
- `humanApproved`: authenticated operator approval is required before publish readiness.
- `rateLimitReady`: account/API budget evidence is fresh before any live mutation.
- `idempotencyReady`: a stable idempotency key exists before enqueueing a publish attempt.

## Review cadence

Re-check these sources before the first live WebAPI mutation, after any Aukro notice about terms/API changes, and at least quarterly while Aukro automation remains active. Update this document and the policy gates when source URLs, effective dates, WebAPI contracts, prohibited-goods rules, or privacy/cookie rules change.
