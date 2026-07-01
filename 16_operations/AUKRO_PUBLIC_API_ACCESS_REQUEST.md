---
id: OPS-AUKRO-PUBLIC-API-ACCESS-REQUEST
status: sent
owner: Operations
created: 2026-07-01
last_updated: 2026-07-01
related_tasks:
  - ../11_tasks/TASK-014-official-aukro-public-api-executor.md
  - ../11_tasks/TASK-015-mp-xml-feed-executor.md
sensitive_data: no-secret-values
---
# Aukro Public API Access Request Draft

## Purpose

This request was prepared for Aukro support to obtain or enable the Public API key needed for automatic integration through the official Aukro API. Do not include passwords, API keys, bearer tokens, or raw customer/order data in this document.

## Czech Email Draft

Subject: Žádost o přístup k Aukro Public API a vydání API klíče pro účet alfarescz

Dobrý den,

prosím o aktivaci přístupu k Aukro Public API pro uživatelský účet `alfarescz` a o zaslání nebo zpřístupnění API klíče pro hlavičku `X-Aukro-Api-Key`.

Chceme automatizovat správu vlastních nabídek z našeho katalogového systému: vytváření a aktualizaci nabídek přes `/api/v2/offers-v2`, načítání seznamu a detailu nabídek pro párování a statistiky, práci s obrázky, kategoriemi, parametry a šablonami dopravy, a později nastavení webhooků pro události objednávek a nabídek.

Prosíme také o potvrzení:

- zda se pro `/api/v2/authenticate` používá běžné uživatelské jméno a heslo účtu, nebo zvláštní API přihlašovací údaje;
- zda je potřeba další schválení pro produkční používání API;
- jaké jsou aktuální rate limity a doporučení pro automatické vytváření a aktualizace nabídek;
- zda existuje testovací nebo sandbox přístup pro ověření integrace;
- kde v administraci účtu lze API klíč zobrazit, obnovit nebo deaktivovat.

Nebudeme používat scraping ani browser automatizaci pro živé publikování. Integrace má běžet přes oficiální Aukro Public API podle dokumentace na `https://api.aukro.cz/`.

Děkuji.

## Sent Status

User confirmed on 2026-07-01 that this request was sent to Aukro support. The repository does not contain, and must not contain, any returned API key or credential values. TASK-014 remains blocked until the credential flow and `X-Aukro-Api-Key` are confirmed through secret-backed runtime configuration.

## English Reference

Please enable Aukro Public API access for account `alfarescz` and provide or expose the API key used in the `X-Aukro-Api-Key` header. We need it for automated management of our own offers from our catalog system through the official API, including offer create/update, offer reads/statistics, image/category/attribute/shipping-template handling, and later webhooks. Please confirm login method, production approval requirements, rate limits, sandbox availability, and where the key can be viewed or rotated.

## Internal Notes

- TASK-014 official Public API executor remains blocked until the API key and credential flow are confirmed.
- TASK-015 MP XML feed executor is only a fallback lane and does not replace official API access.
- TASK-015 XML generator worker started on 2026-07-01 as a fallback implementation lane.
- Do not paste secret values back into docs or chat after support replies.
