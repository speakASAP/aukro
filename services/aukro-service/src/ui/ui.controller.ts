import { Body, Controller, ForbiddenException, Get, Header, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthService, AuthUser, CatalogClientService, PrismaService, JwtAuthGuard } from '@aukro/shared';
import { OffersService } from '../aukro/offers/offers.service';

interface UiAuthRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface UiPublishRequest {
  productId: string;
  accountId?: string;
}

@Controller()
export class UiController {
  constructor(
    private readonly authService: AuthService,
    private readonly catalogClient: CatalogClientService,
    private readonly offersService: OffersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  landing(): string {
    return this.renderShell({ page: 'landing' });
  }

  @Get('dashboard')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dashboard(): string {
    return this.renderShell({ page: 'dashboard' });
  }

  @Post('ui/auth/login')
  async login(@Body() body: UiAuthRequest) {
    return this.authService.login({ email: body.email, password: body.password });
  }

  @Post('ui/auth/register')
  async register(@Body() body: UiAuthRequest) {
    return this.authService.register({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
    });
  }

  @Get('ui/me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    const user = req.user as AuthUser;
    const account = await this.ensureAukroAccount(user);

    return {
      user,
      account: this.publicAccount(account),
      isAukroAdmin: this.isAukroAdmin(user),
    };
  }

  @Get('ui/dashboard')
  @UseGuards(JwtAuthGuard)
  async dashboardData(@Req() req: any) {
    const user = req.user as AuthUser;
    const account = await this.ensureAukroAccount(user);
    const [offers, orders] = await Promise.all([
      this.prisma.aukroOffer.findMany({
        where: { accountId: account.id },
        orderBy: { updatedAt: 'desc' },
        take: 24,
      }),
      this.prisma.aukroOrder.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ]);

    return {
      user,
      account: this.publicAccount(account),
      isAukroAdmin: this.isAukroAdmin(user),
      summary: this.dashboardSummary(offers, orders),
      offers: offers.map((offer) => this.publicOffer(offer)),
      orders: orders.map((order) => this.publicOrder(order)),
    };
  }

  @Get('ui/catalog/products')
  @UseGuards(JwtAuthGuard)
  async catalogProducts(@Query() query: any) {
    const limit = this.safeNumber(query.limit, 12, 1, 50);
    const page = this.safeNumber(query.page, 1, 1, 1000);

    return this.catalogClient.searchProducts({
      search: query.search ? String(query.search) : undefined,
      categoryId: query.categoryId ? String(query.categoryId) : undefined,
      isActive: query.isActive === undefined ? true : String(query.isActive) === 'true',
      page,
      limit,
    });
  }

  @Post('ui/publish')
  @UseGuards(JwtAuthGuard)
  async publish(@Req() req: any, @Body() body: UiPublishRequest) {
    const user = req.user as AuthUser;
    const account = body.accountId
      ? await this.prisma.aukroAccount.findUnique({ where: { id: body.accountId } })
      : await this.ensureAukroAccount(user);

    if (!account) {
      throw new ForbiddenException('Aukro ucet neni dostupny pro prihlaseneho uzivatele.');
    }

    return this.offersService.createFromCatalog({
      accountId: account.id,
      productId: body.productId,
      requestedBy: user.email || user.id,
    });
  }

  @Get('ui/admin/services')
  @UseGuards(JwtAuthGuard)
  async adminServices(@Req() req: any) {
    const user = req.user as AuthUser;
    if (!this.isAukroAdmin(user)) {
      throw new ForbiddenException('Admin sekce je dostupna pouze spravcum Aukro sluzby.');
    }

    return {
      admin: user.email,
      services: [
        { name: 'Auth microservice', role: 'Centralni prihlaseni, registrace a JWT', route: '/aukro/ui/auth/login', owner: 'auth-microservice' },
        { name: 'Catalog microservice', role: 'Zdroj produktu pro publikovani na Aukro', route: '/aukro/ui/catalog/products', owner: 'catalog-microservice' },
        { name: 'Warehouse microservice', role: 'Dostupne skladove mnozstvi pro nabidky', route: '[internal]', owner: 'warehouse-microservice' },
        { name: 'Aukro service', role: 'Priprava nabidek, policy gate a publikacni fronta', route: '/aukro/offers', owner: 'aukro-service' },
        { name: 'Orders microservice', role: 'Navazani objednavek z Aukro na centralni objednavky', route: '/aukro/orders', owner: 'orders-microservice' },
        { name: 'AI microservice', role: 'Navrhy textu nabidek a posouzeni rizik', route: '[internal]', owner: 'ai-microservice' },
        { name: 'Notifications microservice', role: 'Upozorneni operatorum a klientum', route: '[internal]', owner: 'notifications-microservice' },
        { name: 'Logging microservice', role: 'Audit a provozni udalosti', route: '[internal]', owner: 'logging-microservice' },
      ],
    };
  }

  private async ensureAukroAccount(user: AuthUser) {
    const email = user.email || `${user.id}@unknown`;
    const existing = await this.prisma.aukroAccount.findFirst({ where: { email, isActive: true } });
    if (existing) return existing;

    return this.prisma.aukroAccount.create({
      data: {
        email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || email,
        isActive: true,
      },
    });
  }

  private publicAccount(account: any) {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      isActive: Boolean(account.isActive),
      isLinkedToAukro: Boolean(account.apiKey),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private publicOffer(offer: any) {
    const rawData = this.asRecord(offer.rawData);
    const draft = this.asRecord(rawData.draft);
    const publishQueue = this.asRecord(rawData.publishQueue);
    const reconciliation = this.asRecord(rawData.reconciliation);

    return {
      id: offer.id,
      accountId: offer.accountId,
      productId: offer.productId,
      aukroOfferId: offer.aukroOfferId,
      title: offer.title,
      description: offer.description,
      price: this.numberOrNull(offer.price),
      stockQuantity: offer.stockQuantity,
      isActive: Boolean(offer.isActive),
      draftStatus: draft.draftStatus || null,
      policyReasonCodes: Array.isArray(draft.policyReasonCodes) ? draft.policyReasonCodes : [],
      publishStatus: publishQueue.status || null,
      reconciliationStatus: this.asRecord(reconciliation.lastReport).status || null,
      updatedAt: offer.updatedAt,
    };
  }

  private publicOrder(order: any) {
    return {
      id: order.id,
      aukroOrderId: order.aukroOrderId,
      orderId: order.orderId,
      customerEmail: order.customerEmail,
      total: this.numberOrNull(order.total),
      currency: order.currency,
      status: order.status,
      forwarded: Boolean(order.forwarded),
      createdAt: order.createdAt,
    };
  }

  private dashboardSummary(offers: any[], orders: any[]) {
    return {
      offersTotal: offers.length,
      activeOffers: offers.filter((offer) => offer.isActive).length,
      drafts: offers.filter((offer) => Boolean(this.asRecord(this.asRecord(offer.rawData).draft).draftVersion)).length,
      blockedDrafts: offers.filter((offer) => this.asRecord(this.asRecord(offer.rawData).draft).draftStatus === 'blocked').length,
      ordersTotal: orders.length,
      unforwardedOrders: orders.filter((order) => !order.forwarded).length,
    };
  }

  private asRecord(value: any): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  private numberOrNull(value: any): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isAukroAdmin(user: AuthUser): boolean {
    const email = (user.email || '').toLowerCase();
    const configuredEmails = (process.env.AUKRO_ADMIN_EMAILS || 'test@example.com')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const roles = new Set([...(user.roles || []), ...(user.permissions || [])].map((item) => item.toLowerCase()));

    return configuredEmails.includes(email)
      || roles.has('admin')
      || roles.has('aukro:admin')
      || roles.has('alfares:admin')
      || roles.has('app:aukro-service:admin')
      || roles.has('service:aukro:admin');
  }

  private safeNumber(value: any, fallback: number, min: number, max: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
  }

  private renderShell({ page }: { page: 'landing' | 'dashboard' }): string {
    const isDashboard = page === 'dashboard';
    const authBaseUrl = (process.env.HOSTED_AUTH_URL || 'https://auth.alfares.cz').replace(/\/$/, '');
    const dashboardReturnUrl = process.env.AUKRO_DASHBOARD_URL || 'https://aukro.alfares.cz/dashboard';
    const hostedLoginUrl = `${authBaseUrl}/login?client_id=aukro&return_url=${encodeURIComponent(dashboardReturnUrl)}&state=aukro-dashboard`;
    const hostedRegisterUrl = `${authBaseUrl}/register?client_id=aukro&return_url=${encodeURIComponent(dashboardReturnUrl)}&state=aukro-dashboard`;

    return `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aukro Publisher Alfares</title>
  <style>
    :root { color-scheme: light; --ink: #152026; --muted: #60707a; --line: #d8e1e6; --soft: #f3f7f8; --panel: #ffffff; --brand: #d93622; --brand-dark: #a9291a; --ok: #177a4d; --warn: #a85d12; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: #f7fafb; }
    a { color: inherit; }
    .shell { max-width: 1180px; margin: 0 auto; padding: 24px; }
    header { min-height: 76px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 850; font-size: 18px; text-decoration: none; }
    .badge { width: 38px; height: 38px; border-radius: 8px; display: grid; place-items: center; color: #fff; background: var(--brand); }
    .nav { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    button, .button { min-height: 42px; border: 1px solid var(--line); border-radius: 8px; padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #fff; color: var(--ink); font-weight: 760; text-decoration: none; cursor: pointer; }
    button.primary, .button.primary { border-color: var(--brand); background: var(--brand); color: #fff; }
    button:disabled { opacity: .55; cursor: wait; }
    .hero { min-height: calc(100vh - 120px); display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(340px, .98fr); gap: 42px; align-items: center; padding: 28px 0 44px; }
    h1 { margin: 0; max-width: 780px; font-size: clamp(42px, 5.8vw, 74px); line-height: .98; letter-spacing: 0; }
    .lead { margin: 22px 0 0; max-width: 680px; color: var(--muted); font-size: 20px; line-height: 1.55; }
    .hero-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 24px; box-shadow: 0 22px 60px rgba(21,32,38,.12); }
    .pipeline { display: grid; gap: 14px; }
    .step { display: grid; grid-template-columns: 34px 1fr; gap: 12px; align-items: start; padding: 14px; border: 1px solid var(--line); border-radius: 8px; background: #fbfdfd; }
    .num { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; background: #152026; color: #fff; font-weight: 800; font-size: 13px; }
    .step b, .card b { display: block; margin-bottom: 5px; } .step span, .card p, .hint { color: var(--muted); line-height: 1.45; }
    .section { border-top: 1px solid var(--line); padding: 28px 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .card, .panel { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
    .app { display: block; padding: 24px 0 48px; }
    .auth { display: grid; grid-template-columns: minmax(280px, 420px) 1fr; gap: 20px; align-items: start; }
    label { display: grid; gap: 7px; color: var(--muted); font-size: 13px; font-weight: 720; }
    input { width: 100%; min-height: 42px; border: 1px solid var(--line); border-radius: 8px; padding: 0 12px; font: inherit; background: #fff; }
    .form { display: grid; gap: 12px; }
    .tabs { display: flex; gap: 8px; padding-bottom: 10px; }
    .tabs button { min-height: 36px; padding: 0 12px; }
    .tabs button.active { border-color: var(--ink); background: var(--ink); color: #fff; }
    .toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 16px 0; }
    .toolbar input { max-width: 320px; }
    .dashboard-head { display: grid; grid-template-columns: minmax(280px, 1.1fr) minmax(320px, .9fr); gap: 16px; margin-bottom: 16px; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .metric { border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fbfdfd; }
    .metric strong { display: block; font-size: 24px; line-height: 1; }
    .metric span { display: block; margin-top: 6px; color: var(--muted); font-size: 12px; font-weight: 720; }
    .status-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 10px 0 0; }
    .status-dot { width: 10px; height: 10px; border-radius: 99px; background: var(--warn); }
    .status-dot.ok { background: var(--ok); }
    .workspace { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .list { display: grid; gap: 10px; }
    .row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fbfdfd; }
    .row-actions { display: flex; gap: 8px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
    .product { min-height: 210px; display: grid; gap: 10px; align-content: start; }
    .meta { color: var(--muted); font-size: 13px; display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { border: 1px solid var(--line); border-radius: 999px; padding: 4px 8px; background: #fbfdfd; }
    .message { min-height: 24px; color: var(--muted); }
    .message.ok { color: var(--ok); } .message.warn { color: var(--warn); }
    .admin { display: none; margin-top: 20px; }
    .services { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .service { border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: #fbfdfd; }
    .hidden { display: none !important; }
    @media (max-width: 900px) { .hero, .auth, .dashboard-head { grid-template-columns: 1fr; } .section, .grid, .services, .metrics { grid-template-columns: 1fr; } header { align-items: flex-start; flex-direction: column; } .shell { padding: 18px; } }
  </style>
</head>
<body data-page="${page}">
  <main class="shell">
    <header>
      <a class="brand" href="/"><span class="badge">A</span><span>Aukro Publisher Alfares</span></a>
      <nav class="nav">
        <a class="button primary" href="${hostedLoginUrl}">Vstoupit do klientského dashboardu</a>
      </nav>
    </header>

    <section class="hero ${isDashboard ? 'hidden' : ''}">
      <div>
        <h1>Automatizovane publikovani produktu na Aukro</h1>
        <p class="lead">Sluzba bere produkty z katalogu dostupneho zbozi, kontroluje skladovou dostupnost, cenu a podklady pro inzerat a pripravi jejich publikovani na Aukro v automatizovanem rezimu.</p>
        <div class="toolbar"><a class="button primary" href="${hostedLoginUrl}">Vstoupit do klientského dashboardu</a></div>
      </div>
      <div class="hero-panel">
        <div class="pipeline">
          <div class="step"><span class="num">1</span><div><b>Katalog produktu</b><span>Klient pripoji svuj katalog a pracuje s produkty, ktere ma v Alfares katalogu a skladu.</span></div></div>
          <div class="step"><span class="num">2</span><div><b>Kontrola pred publikovanim</b><span>System doplni cenu, sklad, media a pravidla Aukro policy gate.</span></div></div>
          <div class="step"><span class="num">3</span><div><b>Publikace na Aukro</b><span>Z vybraneho produktu vznikne Aukro draft pripraveny pro schvaleni a publikacni frontu.</span></div></div>
        </div>
      </div>
    </section>

    <section class="section ${isDashboard ? 'hidden' : ''}" aria-label="Moznosti sluzby">
      <article class="card"><b>Produkty ze skladu</b><p>Vyber z dostupnych produktu v katalogu, vcetne ceny, medii a skladoveho mnozstvi.</p></article>
      <article class="card"><b>Bezpecne prihlaseni</b><p>Prihlaseni a registrace pouzivaji centralni Auth microservice pro jednotny Alfares ucet.</p></article>
      <article class="card"><b>Sprava publikaci</b><p>Dashboard vytvari Aukro nabidky z katalogu a zobrazuje stav pripravy pro klienta i admina.</p></article>
    </section>

    <section id="dashboard" class="app ${isDashboard ? '' : 'hidden'}">
      <div class="panel" id="authView">
        <h2>Overuji prihlaseni</h2>
        <p class="hint">Pro vstup do klientského dashboardu budete presmerovani do Alfares Auth.</p>
      </div>

      <div id="clientView" class="hidden">
        <div class="dashboard-head">
          <div class="panel">
            <h2>Aukro klientsky dashboard</h2>
            <p class="hint" id="userLine"></p>
            <div class="status-line"><span class="status-dot" id="linkDot"></span><strong id="accountLink">Aukro ucet se nacita</strong></div>
            <div class="meta" id="accountMeta"></div>
            <div class="toolbar"><button id="logout" type="button">Odhlasit</button></div>
          </div>
          <div class="panel">
            <h2>Prehled</h2>
            <div class="metrics" id="metrics"></div>
          </div>
        </div>

        <div class="workspace">
          <div class="panel">
            <h2>Produkty k prodeji na Aukro</h2>
            <div class="toolbar"><input id="search" type="search" placeholder="Hledat v katalogu" /><button id="loadProducts" type="button">Nacist produkty</button></div>
            <div class="message" id="catalogMessage"></div>
            <div class="grid" id="products"></div>
          </div>
          <div class="panel">
            <h2>Moje Aukro nabidky a drafty</h2>
            <div class="message" id="offersMessage"></div>
            <div class="list" id="offers"></div>
          </div>
          <div class="panel">
            <h2>Objednavky z Aukro</h2>
            <div class="message" id="ordersMessage"></div>
            <div class="list" id="orders"></div>
          </div>
        </div>

        <div class="admin panel" id="adminView">
          <h2>Admin sekce Alfares sluzeb</h2>
          <p class="hint">Viditelne pouze pro spravce Aukro sluzby.</p>
          <div class="services" id="services"></div>
        </div>
      </div>
    </section>
  </main>
  <script>
    const state = { token: localStorage.getItem('aukroAccessToken') || '', me: null, dashboard: null };
    const $ = (id) => document.getElementById(id);
    const page = document.body.dataset.page;
    const hostedLoginUrl = '${hostedLoginUrl}';
    const api = async (url, options = {}) => {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (state.token) headers.Authorization = 'Bearer ' + state.token;
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.message || data.error?.message || 'Pozadavek selhal');
        error.status = response.status;
        throw error;
      }
      return data;
    };
    const consumeAuthFragment = () => {
      const fragment = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : '');
      const accessToken = fragment.get('access_token');
      const returnedState = fragment.get('state');
      if (!accessToken) return false;
      if (returnedState && returnedState !== 'aukro-dashboard') {
        history.replaceState(null, '', location.pathname + location.search);
        return false;
      }
      state.token = accessToken;
      localStorage.setItem('aukroAccessToken', accessToken);
      history.replaceState(null, '', location.pathname + location.search);
      return true;
    };
    const redirectToAuth = () => {
      localStorage.removeItem('aukroAccessToken');
      location.replace(hostedLoginUrl);
    };
    const showDashboardError = (error) => {
      $('authView').classList.remove('hidden');
      $('clientView').classList.add('hidden');
      $('authView').innerHTML = '<h2>Dashboard se nepodarilo nacist</h2><p class="hint">Prihlaseni probehlo, ale server vratil chybu dashboardu. Zkuste obnovit stranku nebo kontaktujte podporu Alfares.</p><p class="message warn">' + escapeHtml(error.message || 'Neocekavana chyba serveru.') + '</p><div class="toolbar"><button id="retryDashboard" type="button">Zkusit znovu</button><button id="logoutAfterError" type="button">Odhlasit</button></div>';
      $('retryDashboard').addEventListener('click', () => showClient().catch(handleDashboardError));
      $('logoutAfterError').addEventListener('click', () => { localStorage.removeItem('aukroAccessToken'); location.replace('/'); });
    };
    const handleDashboardError = (error) => {
      if (error.status === 401 || error.status === 403) redirectToAuth();
      else showDashboardError(error);
    };
    const showClient = async () => {
      const dashboard = await api('/aukro/ui/dashboard');
      state.dashboard = dashboard;
      state.me = dashboard;
      $('authView').classList.add('hidden');
      $('clientView').classList.remove('hidden');
      renderDashboard(dashboard);
      loadProducts().catch((error) => {
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = error.message || 'Produkty se nepodarilo nacist.';
      });
      if (dashboard.isAukroAdmin) {
        loadAdmin().catch(() => {
          $('adminView').style.display = 'none';
        });
      }
    };
    const renderDashboard = (dashboard) => {
      const account = dashboard.account || {};
      const summary = dashboard.summary || {};
      $('userLine').textContent = 'Prihlasen: ' + (dashboard.user.email || dashboard.user.id) + ' | Klientsky ucet: ' + (account.name || account.email || account.id);
      $('linkDot').classList.toggle('ok', Boolean(account.isLinkedToAukro));
      $('accountLink').textContent = account.isLinkedToAukro ? 'Aukro ucet je pripojeny' : 'Aukro API ucet zatim neni pripojeny';
      $('accountMeta').innerHTML = '<span class="pill">' + escapeHtml(account.email || 'email nezadan') + '</span><span class="pill">' + (account.isActive ? 'aktivni' : 'neaktivni') + '</span><span class="pill">ID ' + escapeHtml(account.id || '-') + '</span>';
      $('metrics').innerHTML = metric(summary.offersTotal || 0, 'nabidky celkem') + metric(summary.activeOffers || 0, 'aktivni nabidky') + metric(summary.drafts || 0, 'drafty') + metric(summary.blockedDrafts || 0, 'blokovane drafty') + metric(summary.ordersTotal || 0, 'objednavky') + metric(summary.unforwardedOrders || 0, 'nepredane objednavky');
      renderOffers(dashboard.offers || []);
      renderOrders(dashboard.orders || []);
    };
    const metric = (value, label) => '<div class="metric"><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + '</span></div>';
    const renderOffers = (offers) => {
      $('offersMessage').textContent = offers.length ? 'Nalezeny Aukro nabidky a pripravene drafty.' : 'Zatim nemate zadne Aukro nabidky ani drafty.';
      $('offers').innerHTML = offers.map((offer) => {
        const stateLabel = offer.aukroOfferId ? 'Aukro ID: ' + offer.aukroOfferId : (offer.draftStatus ? 'Draft: ' + offer.draftStatus : 'lokalni zaznam');
        const blockers = offer.policyReasonCodes && offer.policyReasonCodes.length ? '<span class="pill">blokery: ' + escapeHtml(offer.policyReasonCodes.join(', ')) + '</span>' : '';
        return '<article class="row"><div><b>' + escapeHtml(offer.title || 'Nabidka bez nazvu') + '</b><div class="meta"><span class="pill">' + escapeHtml(stateLabel) + '</span><span class="pill">' + money(offer.price) + '</span><span class="pill">sklad ' + escapeHtml(offer.stockQuantity ?? 0) + '</span>' + blockers + '</div></div><div class="row-actions"><span class="pill">' + (offer.isActive ? 'aktivni' : 'neaktivni') + '</span></div></article>';
      }).join('');
    };
    const renderOrders = (orders) => {
      $('ordersMessage').textContent = orders.length ? 'Posledni objednavky z Aukro.' : 'Zatim nejsou ulozene zadne objednavky z Aukro.';
      $('orders').innerHTML = orders.map((order) => '<article class="row"><div><b>Objednavka ' + escapeHtml(order.aukroOrderId || order.id) + '</b><div class="meta"><span class="pill">' + escapeHtml(order.status || 'bez stavu') + '</span><span class="pill">' + money(order.total, order.currency) + '</span><span class="pill">' + (order.forwarded ? 'predano do orders' : 'ceka na predani') + '</span></div></div><div class="row-actions"><span class="pill">' + escapeHtml(order.customerEmail || 'zakaznik nezadan') + '</span></div></article>').join('');
    };
    const loadProducts = async () => {
      $('catalogMessage').className = 'message';
      $('catalogMessage').textContent = 'Nacitam produkty z catalog-microservice...';
      const search = $('search').value.trim();
      const result = await api('/aukro/ui/catalog/products?limit=12' + (search ? '&search=' + encodeURIComponent(search) : ''));
      const items = result.items || [];
      $('catalogMessage').textContent = items.length ? 'Produkty jsou pripravene k publikovani.' : 'V katalogu nebyly nalezeny zadne produkty.';
      $('products').innerHTML = items.map((item) => productCard(item)).join('');
      document.querySelectorAll('[data-publish]').forEach((button) => button.addEventListener('click', () => publishProduct(button.dataset.publish, button)));
    };
    const productCard = (item) => {
      const title = item.title || item.name || 'Produkt bez nazvu';
      const sku = item.sku || item.code || 'bez SKU';
      const category = item.categoryId || item.category?.name || 'kategorie nezadana';
      return '<article class="card product"><b>' + escapeHtml(title) + '</b><p class="hint">' + escapeHtml(item.description || 'Popis bude prevzat z katalogu pri vytvoreni Aukro draftu.') + '</p><div class="meta"><span class="pill">SKU: ' + escapeHtml(sku) + '</span><span class="pill">' + escapeHtml(category) + '</span></div><button class="primary" type="button" data-publish="' + escapeHtml(item.id) + '">Publikovat na Aukro</button></article>';
    };
    const publishProduct = async (productId, button) => {
      button.disabled = true;
      $('catalogMessage').textContent = 'Vytvarim Aukro draft...';
      try {
        const result = await api('/aukro/ui/publish', { method: 'POST', body: JSON.stringify({ productId }) });
        $('catalogMessage').className = 'message ok';
        $('catalogMessage').textContent = 'Aukro draft ' + (result.action === 'reused' ? 'byl znovu pouzit' : 'byl vytvoren') + '. Stav: ' + result.draftStatus + '. ' + (result.blockers?.length ? 'Blokery: ' + result.blockers.join(', ') : 'Bez blokeru.');
        const dashboard = await api('/aukro/ui/dashboard');
        renderDashboard(dashboard);
      } catch (error) {
        $('catalogMessage').className = 'message warn';
        $('catalogMessage').textContent = error.message;
      } finally { button.disabled = false; }
    };
    const loadAdmin = async () => {
      const result = await api('/aukro/ui/admin/services');
      $('adminView').style.display = 'block';
      $('services').innerHTML = result.services.map((service) => '<div class="service"><b>' + escapeHtml(service.name) + '</b><p class="hint">' + escapeHtml(service.role) + '</p><div class="meta"><span class="pill">' + escapeHtml(service.owner) + '</span><span class="pill">' + escapeHtml(service.route) + '</span></div></div>').join('');
    };
    const money = (value, currency = 'CZK') => value === null || value === undefined ? 'cena nezadana' : new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: currency || 'CZK' }).format(Number(value));
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    if (page === 'dashboard') {
      consumeAuthFragment();
      $('loadProducts').addEventListener('click', loadProducts);
      $('logout').addEventListener('click', () => { localStorage.removeItem('aukroAccessToken'); location.replace('/'); });
      if (state.token) showClient().catch(handleDashboardError);
      else redirectToAuth();
    }
  </script>
</body>
</html>`;
  }
}
