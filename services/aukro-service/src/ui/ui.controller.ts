import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class UiController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  landing(): string {
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="utf-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
      '  <title>Aukro Channel Operations</title>',
      '  <style>',
      '    :root { color-scheme: light; --ink: #172026; --muted: #5f6b73; --line: #d8e0e5; --panel: rgba(255,255,255,0.9); --brand: #e23d28; }',
      '    * { box-sizing: border-box; }',
      '    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: linear-gradient(135deg, #fff 0%, #f3f7f8 42%, #eef4f1 100%); min-height: 100vh; }',
      '    .shell { max-width: 1180px; margin: 0 auto; padding: 28px; }',
      '    header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 8px 0 44px; }',
      '    .mark { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 18px; }',
      '    .badge { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 8px; background: var(--brand); color: #fff; }',
      '    .status { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 14px; }',
      '    .dot { width: 9px; height: 9px; border-radius: 50%; background: #21a56d; box-shadow: 0 0 0 4px rgba(33,165,109,0.15); }',
      '    .hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr); gap: 40px; align-items: center; padding-bottom: 54px; }',
      '    h1 { margin: 0; font-size: clamp(42px, 6vw, 78px); line-height: 0.96; letter-spacing: 0; }',
      '    .lead { margin: 24px 0 0; max-width: 660px; color: var(--muted); font-size: 20px; line-height: 1.55; }',
      '    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }',
      '    a.button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 18px; border-radius: 8px; text-decoration: none; font-weight: 750; border: 1px solid var(--line); color: var(--ink); background: #fff; }',
      '    a.primary { background: var(--brand); border-color: var(--brand); color: #fff; }',
      '    .console { background: #101820; color: #eaf3f4; border-radius: 8px; overflow: hidden; box-shadow: 0 26px 70px rgba(23,32,38,0.22); }',
      '    .bar { display: flex; gap: 7px; padding: 14px 16px; background: #0b1116; }',
      '    .bar span { width: 10px; height: 10px; border-radius: 50%; background: #e66352; } .bar span:nth-child(2) { background: #e6b94f; } .bar span:nth-child(3) { background: #4bbf83; }',
      '    .rows { padding: 22px; display: grid; gap: 15px; }',
      '    .row { display: grid; grid-template-columns: 96px 1fr auto; gap: 14px; align-items: center; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }',
      '    .method { color: #89d7df; } .ok { color: #76d69f; }',
      '    .section { border-top: 1px solid var(--line); padding: 30px 0 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }',
      '    .card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 20px; min-height: 150px; } .card b { display: block; font-size: 15px; margin-bottom: 12px; } .card p { margin: 0; color: var(--muted); line-height: 1.5; }',
      '    @media (max-width: 820px) { .shell { padding: 20px; } header { align-items: flex-start; flex-direction: column; padding-bottom: 30px; } .hero { grid-template-columns: 1fr; gap: 28px; } .section { grid-template-columns: 1fr; } .row { grid-template-columns: 72px 1fr; } .row .ok { grid-column: 2; } }',
      '  </style>',
      '</head>',
      '<body>',
      '  <main class="shell">',
      '    <header><div class="mark"><div class="badge">A</div><span>Aukro Channel</span></div><div class="status"><span class="dot"></span><span>Service online</span></div></header>',
      '    <section class="hero">',
      '      <div><h1>Aukro marketplace operations</h1><p class="lead">Operational landing for the Alfares Aukro integration: catalog offer preparation, policy review, publish queue control, order intake, and reconciliation readiness.</p><div class="actions"><a class="button primary" href="/health">Health</a><a class="button" href="/aukro/workbench/summary">Workbench summary</a><a class="button" href="/aukro/offers">Offers API</a></div></div>',
      '      <div class="console" aria-label="Aukro service route status"><div class="bar"><span></span><span></span><span></span></div><div class="rows"><div class="row"><span class="method">GET</span><span>/</span><span class="ok">landing</span></div><div class="row"><span class="method">GET</span><span>/health</span><span class="ok">ready</span></div><div class="row"><span class="method">GET</span><span>/aukro/workbench/summary</span><span class="ok">ops</span></div><div class="row"><span class="method">GET</span><span>/aukro/offers</span><span class="ok">catalog</span></div><div class="row"><span class="method">GET</span><span>/aukro/orders</span><span class="ok">orders</span></div></div></div>',
      '    </section>',
      '    <section class="section" aria-label="Aukro capabilities"><article class="card"><b>Catalog to Aukro</b><p>Prepare listing drafts from catalog, pricing, stock, media, and marketplace category evidence.</p></article><article class="card"><b>Policy gate</b><p>Surface publish blockers, risk evidence, approval state, rate-limit readiness, and idempotency checks.</p></article><article class="card"><b>Order reconciliation</b><p>Map Aukro order lines back to catalog products and central fulfillment contracts.</p></article></section>',
      '  </main>',
      '</body>',
      '</html>',
    ].join('\n');
  }
}
