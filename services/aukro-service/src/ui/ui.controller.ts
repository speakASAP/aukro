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
  <title>Aukro Automation Alfares</title>
  <style>
    :root {
      color-scheme: light;
      --aukro-orange: #ff5a00;
      --aukro-orange-hover: #df4e00;
      --aukro-blue: #173cb8;
      --aukro-blue-soft: #e8f1fe;
      --aukro-orange-soft: #fff0ec;
      --ink: #202020;
      --ink-strong: #1d1d1f;
      --muted: #666666;
      --muted-2: #777777;
      --line: #dadde0;
      --line-strong: #b9bbbc;
      --bg: #f1f1f3;
      --surface: #ffffff;
      --surface-2: #fafafa;
      --ok: #16834a;
      --warn: #a85d12;
      --shadow: 0 1px 2px rgba(0, 0, 0, .14);
      --radius: 8px;
      --max: 1368px;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Ubuntu, Arial, sans-serif;
      color: var(--ink);
      background: var(--bg);
      font-size: 14px;
      line-height: 1.42;
    }
    a { color: inherit; text-decoration: none; }
    button, input, select { font: inherit; }
    .top { background: var(--surface); }
    .top-inner {
      max-width: var(--max);
      margin: 0 auto;
      min-height: 80px;
      display: grid;
      grid-template-columns: minmax(300px, 340px) minmax(320px, 600px) auto;
      gap: 28px;
      align-items: center;
      padding: 0 16px;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      color: var(--aukro-orange);
      font-size: 40px;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1;
    }
    .search-shell {
      height: 44px;
      border-radius: 22px;
      background: var(--bg);
      display: grid;
      grid-template-columns: 34px 1fr auto;
      align-items: center;
      padding: 0 12px 0 16px;
      color: var(--muted);
      min-width: 0;
    }
    .search-shell input {
      min-width: 0;
      height: 40px;
      border: 0;
      outline: 0;
      background: transparent;
      color: #000;
      font-size: 16px;
      padding: 0 8px;
    }
    .search-shell span:last-child { color: var(--ink); font-size: 13px; white-space: nowrap; }
    .top-actions { display: flex; align-items: center; justify-content: flex-end; gap: 18px; }
    .account-link { display: grid; grid-template-columns: 32px auto; gap: 8px; align-items: center; font-size: 13px; line-height: 1.1; font-weight: 700; }
    .account-icon, .cart-icon, .brand-switch { width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; font-weight: 700; }
    .account-icon { color: #777; border: 2px solid #777; }
    .cart-icon { color: #777; font-size: 23px; }
    .brand-switch { background: var(--aukro-blue); color: #fff; font-size: 24px; }
    .sell-button, button.primary, .button.primary {
      min-height: 40px;
      border: 1px solid var(--aukro-orange);
      border-bottom: 2px solid var(--aukro-orange-hover);
      border-radius: var(--radius);
      background: var(--aukro-orange);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 14px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
    .sell-button:hover, button.primary:hover, .button.primary:hover { background: var(--aukro-orange-hover); }
    .button, button {
      min-height: 40px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--ink);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 14px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }
    button:disabled { opacity: .55; cursor: wait; }
    .category-bar { background: var(--surface); border-top: 1px solid transparent; border-bottom: 1px solid var(--line); }
    .category-inner {
      max-width: var(--max);
      height: 48px;
      margin: 0 auto;
      display: flex;
      align-items: stretch;
      overflow-x: auto;
      padding: 0 16px;
    }
    .category-inner a {
      min-width: max-content;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
      border: 1px solid var(--line);
      border-bottom: 0;
      background: var(--bg);
      font-size: 14px;
      font-weight: 700;
    }
    .category-inner a.active { color: var(--aukro-orange); background: var(--surface); }
    .category-inner .brand-tab { min-width: 64px; background: var(--surface); border: 1px solid var(--line-strong); }
    .page {
      max-width: var(--max);
      margin: 0 auto;
      padding: 20px 16px 52px;
    }
    .market-layout {
      display: grid;
      grid-template-columns: 278px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    .side-panel {
      background: var(--surface);
      min-height: calc(100vh - 150px);
      padding: 24px 18px;
      border-radius: 0;
    }
    .back-link { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; margin-bottom: 18px; }
    .side-list { display: grid; gap: 8px; color: var(--muted); margin: 0 0 18px; padding: 0; list-style: none; }
    .side-list a, .side-list span { display: block; color: var(--muted); padding: 2px 0; }
    .side-title { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line-strong); padding-top: 12px; margin-top: 14px; font-weight: 700; }
    .reset { color: var(--aukro-blue); font-size: 12px; }
    .filter-group { margin-top: 22px; }
    .filter-group h3 { margin: 0 0 10px; font-size: 14px; }
    .check, .radio { display: flex; align-items: center; gap: 8px; min-height: 28px; color: var(--ink); }
    .check span, .radio span { color: var(--muted); }
    .fake-radio, .fake-check {
      width: 22px;
      height: 22px;
      display: inline-grid;
      place-items: center;
      border: 1px solid var(--line-strong);
      background: var(--surface);
    }
    .fake-radio { border-radius: 999px; }
    .fake-radio.active { border: 2px solid var(--aukro-orange); }
    .fake-radio.active::after { content: ""; width: 10px; height: 10px; border-radius: 999px; background: var(--aukro-orange); }
    .fake-check { border-radius: 4px; }
    .content { min-width: 0; }
    .hero-banner {
      min-height: 230px;
      background: linear-gradient(90deg, #ff5a00 0%, #ff6d1a 43%, #a7d35b 43%, #a7d35b 100%);
      color: #fff;
      display: grid;
      grid-template-columns: minmax(0, .95fr) minmax(340px, .85fr);
      overflow: hidden;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
    }
    .hero-copy { padding: 38px 40px; display: grid; align-content: center; gap: 12px; }
    .hero-copy h1 { margin: 0; max-width: 680px; font-size: clamp(34px, 4.8vw, 58px); line-height: 1; letter-spacing: 0; }
    .hero-copy p { margin: 0; max-width: 680px; font-size: 20px; line-height: 1.35; }
    .hero-art { position: relative; min-height: 230px; display: grid; align-items: center; justify-items: center; padding: 22px; color: var(--ink); }
    .automation-card {
      width: min(460px, 92%);
      background: #fff;
      border-radius: var(--radius);
      box-shadow: 0 16px 38px rgba(0, 0, 0, .18);
      padding: 18px;
      color: var(--ink);
    }
    .automation-flow { display: grid; gap: 10px; }
    .flow-row { display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: 12px; border: 1px solid var(--line); border-radius: var(--radius); padding: 10px; background: var(--surface-2); }
    .flow-icon { width: 38px; height: 38px; border-radius: 999px; display: grid; place-items: center; background: var(--aukro-orange-soft); color: var(--aukro-orange); font-weight: 700; }
    .flow-state { color: var(--ok); font-size: 12px; font-weight: 700; }
    .section-title { margin: 0 0 12px; font-size: 28px; line-height: 1.15; font-weight: 700; color: var(--ink); }
    .subline { margin: -4px 0 18px; color: var(--muted); }
    .quick-grid, .category-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 24px;
    }
    .quick-tile, .category-tile, .metric {
      min-height: 54px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: var(--shadow);
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      font-weight: 700;
    }
    .quick-tile.accent { background: var(--aukro-orange); color: #fff; border-color: var(--aukro-orange); }
    .quick-tile.blue { background: var(--aukro-blue); color: #fff; border-color: var(--aukro-blue); }
    .quick-icon { color: var(--aukro-orange); font-size: 20px; line-height: 1; }
    .quick-tile.accent .quick-icon, .quick-tile.blue .quick-icon { color: #fff; }
    .offer-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 24px;
    }
    .product-card {
      min-width: 0;
      background: var(--surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
      color: var(--ink-strong);
    }
    .product-media {
      height: 170px;
      background: linear-gradient(135deg, #f4f4f5, #ffffff);
      display: grid;
      place-items: center;
      position: relative;
      border-bottom: 1px solid #ececec;
    }
    .product-media .thumb {
      width: 94px;
      height: 94px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: var(--aukro-orange-soft);
      color: var(--aukro-orange);
      font-size: 42px;
      font-weight: 700;
      box-shadow: 0 6px 18px rgba(0, 0, 0, .13);
    }
    .heart {
      position: absolute;
      top: 12px;
      right: 12px;
      min-width: 52px;
      height: 38px;
      border-radius: var(--radius);
      background: #fff;
      box-shadow: var(--shadow);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-weight: 700;
    }
    .product-body { padding: 14px 16px 16px; display: grid; gap: 9px; }
    .condition { color: var(--aukro-orange); text-transform: uppercase; font-size: 12px; font-weight: 700; letter-spacing: .03em; }
    .product-title { margin: 0; font-size: 17px; line-height: 1.25; font-weight: 700; }
    .price { font-size: 22px; font-weight: 700; text-align: right; }
    .muted { color: var(--muted); }
    .tabs-bar {
      background: var(--surface);
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      align-items: center;
      padding: 16px;
      margin-bottom: 16px;
    }
    .tabs-bar .tab {
      min-width: 118px;
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: 0;
      background: var(--surface);
      color: var(--ink);
      padding: 0 16px;
      font-weight: 500;
    }
    .tabs-bar .tab.active { background: var(--aukro-orange); color: #fff; border-color: var(--aukro-orange); }
    .sort-control { margin-left: auto; display: flex; align-items: center; gap: 10px; }
    .select-like { min-height: 36px; border: 1px solid var(--line); background: #fff; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; }
    .panel { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); padding: 18px; }
    .dashboard-head { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 16px; margin-bottom: 16px; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .metric { min-height: 72px; display: block; }
    .metric strong { display: block; font-size: 26px; line-height: 1; }
    .metric span { display: block; margin-top: 8px; color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .status-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
    .status-dot { width: 12px; height: 12px; border-radius: 99px; background: var(--warn); }
    .status-dot.ok { background: var(--ok); }
    .meta { color: var(--muted); font-size: 13px; display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { border: 1px solid var(--line); border-radius: 999px; padding: 4px 9px; background: var(--surface-2); color: var(--muted); }
    .toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 14px 0; }
    .toolbar input, .field {
      width: min(100%, 360px);
      min-height: 40px;
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 0;
      padding: 0 12px;
    }
    .message { min-height: 24px; color: var(--muted); }
    .message.ok { color: var(--ok); }
    .message.warn { color: var(--warn); }
    .workspace { display: grid; gap: 16px; }
    .list { display: grid; gap: 10px; }
    .listing-row {
      display: grid;
      grid-template-columns: 132px minmax(0, 1fr) 150px;
      gap: 16px;
      align-items: stretch;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .listing-thumb { background: linear-gradient(135deg, var(--aukro-orange-soft), #fff); display: grid; place-items: center; font-size: 34px; color: var(--aukro-orange); font-weight: 700; }
    .listing-main { padding: 16px 0; min-width: 0; }
    .listing-main b { display: block; font-size: 18px; margin-bottom: 8px; }
    .listing-side { padding: 16px; border-left: 1px solid var(--line); display: grid; align-content: center; gap: 6px; text-align: right; }
    .services { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .service { border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; background: #fff; box-shadow: var(--shadow); }
    .admin { display: none; margin-top: 16px; }
    .hidden { display: none !important; }
    .empty-state { background: #fff; box-shadow: var(--shadow); padding: 28px; border-radius: var(--radius); }
    @media (max-width: 1120px) {
      .top-inner { grid-template-columns: 1fr; gap: 12px; padding: 18px 16px; }
      .top-actions { justify-content: flex-start; flex-wrap: wrap; }
      .market-layout { grid-template-columns: 1fr; }
      .content { order: 1; }
      .side-panel { min-height: 0; order: 2; }
      .quick-grid, .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .offer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .hero-banner, .dashboard-head { grid-template-columns: 1fr; }
      .sort-control { margin-left: 0; width: 100%; }
    }
    @media (max-width: 640px) {
      .logo { font-size: 38px; }
      .page { padding: 12px; }
      .hero-copy { padding: 26px 20px; }
      .hero-copy p { font-size: 17px; }
      .quick-grid, .category-grid, .offer-grid, .metrics, .services { grid-template-columns: 1fr; }
      .listing-row { grid-template-columns: 92px minmax(0, 1fr); }
      .listing-side { grid-column: 1 / -1; border-left: 0; border-top: 1px solid var(--line); text-align: left; }
      .category-inner { padding: 0 8px; }
    }
  </style>
</head>
<body data-page="${page}">
  <div class="top">
    <header class="top-inner">
      <a class="logo" href="/">Aukro.Alfares</a>
      <div class="search-shell" aria-label="Vyhledavani">
        <span>⌕</span>
        <input type="search" aria-label="Hledat" placeholder="Hledat" />
        <span>Všechny kategorie⌄</span>
      </div>
      <div class="top-actions">
        <a class="account-link" href="${hostedLoginUrl}"><span class="account-icon">•</span><span>Můj účet<br />Přihlásit</span></a>
        <span class="cart-icon" aria-hidden="true">▰</span>
        <a class="sell-button" href="${hostedLoginUrl}">⊕ Prodat</a>
      </div>
    </header>
    <nav class="category-bar" aria-label="Kategorie">
      <div class="category-inner">
        <a class="active" href="/">Automatizace</a>
        <a href="/dashboard">Katalog</a>
        <a href="/dashboard">Publikace</a>
        <a href="/dashboard">Aktualizace</a>
        <a href="/dashboard">Objednávky</a>
        <a href="/dashboard">Sklad</a>
        <a href="/dashboard">Monitoring</a>
        <a href="/dashboard">Policy gate</a>
        <a href="/dashboard">Reporty</a>
        <a href="/dashboard">Vše</a>
        <a class="brand-tab" href="/"><span class="brand-switch">a</span></a>
      </div>
    </nav>
  </div>

  <main class="page">
    <section class="market-layout ${isDashboard ? 'hidden' : ''}">
      <aside class="side-panel" aria-label="Filtry automatizace">
        <a class="back-link" href="/">‹ Automatizace Aukro</a>
        <ul class="side-list">
          <li><a href="#workflow">Napojení katalogu (24)</a></li>
          <li><a href="#workflow">Publikace nabídek (18)</a></li>
          <li><a href="#workflow">Aktualizace cen a skladu (16)</a></li>
          <li><a href="#workflow">Hlídání změn Aukro (12)</a></li>
          <li><a href="#workflow">Objednávky a reporting (9)</a></li>
        </ul>
        <div class="side-title">Parametry <a class="reset" href="/">zrušit filtry</a></div>
        <div class="filter-group">
          <h3>Typ práce</h3>
          <label class="radio"><span class="fake-radio active"></span> Všechny procesy</label>
          <label class="radio"><span class="fake-radio"></span> Publikace</label>
          <label class="radio"><span class="fake-radio"></span> Monitoring</label>
          <label class="radio"><span class="fake-radio"></span> Synchronizace</label>
        </div>
        <div class="filter-group">
          <h3>Stav zboží</h3>
          <label class="check"><span class="fake-check"></span> Nové položky <span>(2542)</span></label>
          <label class="check"><span class="fake-check"></span> Rozbaleno <span>(43)</span></label>
          <label class="check"><span class="fake-check"></span> Použité <span>(31)</span></label>
        </div>
      </aside>

      <section class="content">
        <div class="hero-banner">
          <div class="hero-copy">
            <h1>Automatizace práce se stránkou Aukro</h1>
            <p>Připojíme katalog produktů, hlídáme změny, připravujeme inzeráty, publikujeme nabídky a vracíme objednávky zpět do Alfares.</p>
            <div class="toolbar"><a class="button primary" href="${hostedLoginUrl}">Vstoupit do dashboardu</a><a class="button" href="${hostedRegisterUrl}">Registrovat účet</a></div>
          </div>
          <div class="hero-art" aria-hidden="true">
            <div class="automation-card">
              <div class="automation-flow">
                <div class="flow-row"><span class="flow-icon">1</span><b>Katalog Alfares</b><span class="flow-state">online</span></div>
                <div class="flow-row"><span class="flow-icon">2</span><b>Aukro drafty</b><span class="flow-state">auto</span></div>
                <div class="flow-row"><span class="flow-icon">3</span><b>Publikace a monitoring</b><span class="flow-state">hlídáno</span></div>
              </div>
            </div>
          </div>
        </div>

        <h2 class="section-title">Populární automatizace</h2>
        <div class="quick-grid" id="workflow">
          <a class="quick-tile accent" href="${hostedLoginUrl}"><span class="quick-icon">▧</span> Katalog</a>
          <a class="quick-tile" href="${hostedLoginUrl}"><span class="quick-icon">◴</span> Končící aukce</a>
          <a class="quick-tile" href="${hostedLoginUrl}"><span class="quick-icon">①</span> Od 1 Kč</a>
          <a class="quick-tile" href="${hostedLoginUrl}"><span class="quick-icon">♨</span> Žhavé aukce</a>
          <a class="quick-tile" href="${hostedLoginUrl}"><span class="quick-icon">♕</span> Nejlepší prodejci</a>
          <a class="quick-tile blue" href="${hostedLoginUrl}"><span class="quick-icon">▣</span> Mobilní kontrola</a>
          <a class="quick-tile accent" href="${hostedLoginUrl}"><span class="quick-icon">i</span> Jak to funguje?</a>
        </div>

        <h2 class="section-title">Nabídky automatizace pro vás</h2>
        <p class="subline">Stejná logika jako marketplace list: přehledné karty procesů, rychlé stavy a jasná akce.</p>
        <div class="offer-grid">
          <article class="product-card"><div class="product-media"><span class="thumb">A</span><span class="heart">♡ 32</span></div><div class="product-body"><span class="condition">Katalog</span><h3 class="product-title">Import produktů z Alfares katalogu</h3><p class="muted">Automatické načtení názvů, cen, skladů a médií.</p></div></article>
          <article class="product-card"><div class="product-media"><span class="thumb">↻</span><span class="heart">♡ 24</span></div><div class="product-body"><span class="condition">Aktualizace</span><h3 class="product-title">Hlídání cen, skladu a změn v inzerátu</h3><p class="muted">Služba drží nabídky v souladu s katalogem.</p></div></article>
          <article class="product-card"><div class="product-media"><span class="thumb">✓</span><span class="heart">♡ 22</span></div><div class="product-body"><span class="condition">Policy gate</span><h3 class="product-title">Kontrola před publikací na Aukro</h3><p class="muted">Blokery jsou viditelné dřív, než se nabídka odešle.</p></div></article>
          <article class="product-card"><div class="product-media"><span class="thumb">₭</span><span class="heart">♡ 19</span></div><div class="product-body"><span class="condition">Objednávky</span><h3 class="product-title">Přenos objednávek do Alfares</h3><p class="muted">Objednávky a audit zůstávají v jednom provozním toku.</p></div></article>
        </div>
      </section>
    </section>

    <section id="dashboard" class="app ${isDashboard ? '' : 'hidden'}">
      <div class="market-layout">
        <aside class="side-panel" aria-label="Dashboard filtry">
          <a class="back-link" href="/">‹ Aukro dashboard</a>
          <ul class="side-list">
            <li><span>Moje nabídky</span></li>
            <li><span>Produkty k publikaci</span></li>
            <li><span>Objednávky z Aukro</span></li>
            <li><span>Admin služby</span></li>
          </ul>
          <div class="side-title">Parametry <a class="reset" href="/">zrušit filtry</a></div>
          <div class="filter-group">
            <h3>Typ nabídky</h3>
            <label class="radio"><span class="fake-radio active"></span> Všechny nabídky</label>
            <label class="radio"><span class="fake-radio"></span> Drafty</label>
            <label class="radio"><span class="fake-radio"></span> Aktivní</label>
            <label class="radio"><span class="fake-radio"></span> Blokované</label>
          </div>
          <div class="filter-group">
            <h3>Stav zboží</h3>
            <label class="check"><span class="fake-check"></span> Nové</label>
            <label class="check"><span class="fake-check"></span> Rozbaleno</label>
            <label class="check"><span class="fake-check"></span> Použité</label>
          </div>
        </aside>

        <section class="content">
          <div class="panel" id="authView">
            <h1 class="section-title">Ověřuji přihlášení</h1>
            <p class="muted">Pro vstup do klientského dashboardu budete přesměrováni do Alfares Auth.</p>
            <div class="toolbar"><a class="button primary" href="${hostedLoginUrl}">Přihlásit přes Alfares Auth</a></div>
          </div>

          <div id="clientView" class="hidden">
            <div class="dashboard-head">
              <div class="panel">
                <h1 class="section-title">Aukro klientský dashboard</h1>
                <p class="muted" id="userLine"></p>
                <div class="status-line"><span class="status-dot" id="linkDot"></span><strong id="accountLink">Aukro účet se načítá</strong></div>
                <div class="meta" id="accountMeta"></div>
                <div class="toolbar"><button id="logout" type="button">Odhlásit</button></div>
              </div>
              <div class="panel">
                <h2 class="section-title">Přehled</h2>
                <div class="metrics" id="metrics"></div>
              </div>
            </div>

            <div class="tabs-bar">
              <button class="tab active" type="button">Vše</button>
              <button class="tab" type="button">Kup teď!</button>
              <button class="tab" type="button">Aukce</button>
              <button class="tab" type="button">🌶 Žhavé aukce</button>
              <button class="tab" type="button">⌖ V mém okolí</button>
              <div class="sort-control"><span class="select-like">Seřadit podle: <b>Relevance</b> ⌄</span><span class="quick-icon">▦</span><span>▥</span></div>
            </div>

            <div class="workspace">
              <div class="panel">
                <h2 class="section-title">Produkty k prodeji na Aukro</h2>
                <div class="toolbar"><input id="search" class="field" type="search" placeholder="Vyhledat produkt v katalogu" /><button id="loadProducts" type="button">Načíst produkty</button></div>
                <div class="message" id="catalogMessage"></div>
                <div class="offer-grid" id="products"></div>
              </div>
              <div class="panel">
                <h2 class="section-title">Moje Aukro nabídky a drafty</h2>
                <div class="message" id="offersMessage"></div>
                <div class="list" id="offers"></div>
              </div>
              <div class="panel">
                <h2 class="section-title">Objednávky z Aukro</h2>
                <div class="message" id="ordersMessage"></div>
                <div class="list" id="orders"></div>
              </div>
            </div>

            <div class="admin panel" id="adminView">
              <h2 class="section-title">Admin sekce Alfares služeb</h2>
              <p class="muted">Viditelné pouze pro správce Aukro služby.</p>
              <div class="services" id="services"></div>
            </div>
          </div>
        </section>
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
        const error = new Error(data.message || data.error?.message || 'Požadavek selhal');
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
      $('authView').innerHTML = '<div class="empty-state"><h1 class="section-title">Dashboard se nepodařilo načíst</h1><p class="muted">Přihlášení proběhlo, ale server vrátil chybu dashboardu.</p><p class="message warn">' + escapeHtml(error.message || 'Neočekávaná chyba serveru.') + '</p><div class="toolbar"><button id="retryDashboard" type="button">Zkusit znovu</button><button id="logoutAfterError" type="button">Odhlásit</button></div></div>';
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
        $('catalogMessage').textContent = error.message || 'Produkty se nepodařilo načíst.';
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
      $('userLine').textContent = 'Přihlášen: ' + (dashboard.user.email || dashboard.user.id) + ' | Klientský účet: ' + (account.name || account.email || account.id);
      $('linkDot').classList.toggle('ok', Boolean(account.isLinkedToAukro));
      $('accountLink').textContent = account.isLinkedToAukro ? 'Aukro účet je připojený' : 'Aukro API účet zatím není připojený';
      $('accountMeta').innerHTML = '<span class="pill">' + escapeHtml(account.email || 'email nezadán') + '</span><span class="pill">' + (account.isActive ? 'aktivní' : 'neaktivní') + '</span><span class="pill">ID ' + escapeHtml(account.id || '-') + '</span>';
      $('metrics').innerHTML = metric(summary.offersTotal || 0, 'nabídky celkem') + metric(summary.activeOffers || 0, 'aktivní nabídky') + metric(summary.drafts || 0, 'drafty') + metric(summary.blockedDrafts || 0, 'blokované drafty') + metric(summary.ordersTotal || 0, 'objednávky') + metric(summary.unforwardedOrders || 0, 'nepředané objednávky');
      renderOffers(dashboard.offers || []);
      renderOrders(dashboard.orders || []);
    };
    const metric = (value, label) => '<div class="metric"><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(label) + '</span></div>';
    const renderOffers = (offers) => {
      $('offersMessage').textContent = offers.length ? 'Našli jsme vám celkem ' + offers.length + ' nabídek.' : 'Zatím nemáte žádné Aukro nabídky ani drafty.';
      $('offers').innerHTML = offers.map((offer) => {
        const stateLabel = offer.aukroOfferId ? 'Aukro ID: ' + offer.aukroOfferId : (offer.draftStatus ? 'Draft: ' + offer.draftStatus : 'lokální záznam');
        const blockers = offer.policyReasonCodes && offer.policyReasonCodes.length ? '<span class="pill">blokery: ' + escapeHtml(offer.policyReasonCodes.join(', ')) + '</span>' : '';
        return '<article class="listing-row"><div class="listing-thumb">A</div><div class="listing-main"><span class="condition">' + (offer.isActive ? 'Aktivní' : 'Draft') + '</span><b>' + escapeHtml(offer.title || 'Nabídka bez názvu') + '</b><div class="meta"><span class="pill">' + escapeHtml(stateLabel) + '</span><span class="pill">sklad ' + escapeHtml(offer.stockQuantity ?? 0) + '</span>' + blockers + '</div></div><div class="listing-side"><span class="price">' + money(offer.price) + '</span><span class="muted">' + (offer.isActive ? 'publikováno' : 'čeká na kontrolu') + '</span></div></article>';
      }).join('');
    };
    const renderOrders = (orders) => {
      $('ordersMessage').textContent = orders.length ? 'Poslední objednávky z Aukro.' : 'Zatím nejsou uložené žádné objednávky z Aukro.';
      $('orders').innerHTML = orders.map((order) => '<article class="listing-row"><div class="listing-thumb">₭</div><div class="listing-main"><span class="condition">' + escapeHtml(order.status || 'bez stavu') + '</span><b>Objednávka ' + escapeHtml(order.aukroOrderId || order.id) + '</b><div class="meta"><span class="pill">' + (order.forwarded ? 'předáno do orders' : 'čeká na předání') + '</span><span class="pill">' + escapeHtml(order.customerEmail || 'zákazník nezadán') + '</span></div></div><div class="listing-side"><span class="price">' + money(order.total, order.currency) + '</span><span class="muted">Aukro order</span></div></article>').join('');
    };
    const loadProducts = async () => {
      $('catalogMessage').className = 'message';
      $('catalogMessage').textContent = 'Načítám produkty z catalog-microservice...';
      const search = $('search').value.trim();
      const result = await api('/aukro/ui/catalog/products?limit=12' + (search ? '&search=' + encodeURIComponent(search) : ''));
      const items = result.items || [];
      $('catalogMessage').textContent = items.length ? 'Produkty jsou připravené k publikování.' : 'V katalogu nebyly nalezeny žádné produkty.';
      $('products').innerHTML = items.map((item) => productCard(item)).join('');
      document.querySelectorAll('[data-publish]').forEach((button) => button.addEventListener('click', () => publishProduct(button.dataset.publish, button)));
    };
    const productCard = (item) => {
      const title = item.title || item.name || 'Produkt bez názvu';
      const sku = item.sku || item.code || 'bez SKU';
      const category = item.categoryId || item.category?.name || 'kategorie nezadána';
      const initial = String(title).trim().charAt(0).toUpperCase() || 'A';
      return '<article class="product-card"><div class="product-media"><span class="thumb">' + escapeHtml(initial) + '</span><span class="heart">♡ ' + escapeHtml(item.stockQuantity ?? item.stock ?? 1) + '</span></div><div class="product-body"><span class="condition">Připraveno</span><h3 class="product-title">' + escapeHtml(title) + '</h3><p class="muted">' + escapeHtml(item.description || 'Popis bude převzat z katalogu při vytvoření Aukro draftu.') + '</p><div class="meta"><span class="pill">SKU: ' + escapeHtml(sku) + '</span><span class="pill">' + escapeHtml(category) + '</span></div><button class="primary" type="button" data-publish="' + escapeHtml(item.id) + '">Publikovat na Aukro</button></div></article>';
    };
    const publishProduct = async (productId, button) => {
      button.disabled = true;
      $('catalogMessage').textContent = 'Vytvářím Aukro draft...';
      try {
        const result = await api('/aukro/ui/publish', { method: 'POST', body: JSON.stringify({ productId }) });
        $('catalogMessage').className = 'message ok';
        $('catalogMessage').textContent = 'Aukro draft ' + (result.action === 'reused' ? 'byl znovu použit' : 'byl vytvořen') + '. Stav: ' + result.draftStatus + '. ' + (result.blockers?.length ? 'Blokery: ' + result.blockers.join(', ') : 'Bez blokerů.');
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
      $('services').innerHTML = result.services.map((service) => '<div class="service"><b>' + escapeHtml(service.name) + '</b><p class="muted">' + escapeHtml(service.role) + '</p><div class="meta"><span class="pill">' + escapeHtml(service.owner) + '</span><span class="pill">' + escapeHtml(service.route) + '</span></div></div>').join('');
    };
    const money = (value, currency = 'CZK') => value === null || value === undefined ? 'cena nezadaná' : new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: currency || 'CZK' }).format(Number(value));
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
