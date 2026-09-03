import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoggerService } from '@aukro/shared';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const reporter = require('./vendor/credential-reporter.js');

const SELF_REPORT_CRON = process.env.CREDENTIAL_SELF_REPORT_CRON || '*/30 * * * *';

const ORDERS_URL =
  process.env.ORDERS_SERVICE_URL ||
  'http://orders-microservice.statex-apps.svc.cluster.local:3203';

const WAREHOUSE_URL =
  process.env.WAREHOUSE_SERVICE_URL ||
  'http://warehouse-microservice.statex-apps.svc.cluster.local:3201';

const MONITORING_URL =
  process.env.MONITORING_URL ||
  'http://monitoring-microservice.statex-apps.svc.cluster.local:3395';

/**
 * The two credentials this service holds, each with the read-only route that
 * genuinely enforces its own role.
 *
 * Principals are hardcoded rather than derived from their tokens: the reporter
 * must name the principal the inventory knows even when the deployed token is
 * wrong, which is the case worth reporting.
 *
 * Both probes were verified live before adoption — 200 with the deployed token,
 * 401 with a garbage token, 401 with no credential at all. `GET /api/orders`
 * returns 403 to the same orders token, which is the useful part: it proves the
 * probe route discriminates on this role rather than accepting any valid
 * principal.
 */
const LANES = [
  {
    principal: 'svc-aukro-service--orders-microservice@internal.alfares.cz',
    target: 'orders-microservice',
    tokenEnv: 'ORDERS_SERVICE_TOKEN',
    url: () => `${ORDERS_URL}/api/orders/admin/lifecycle`,
  },
  {
    principal: 'svc-aukro-service--warehouse-microservice@internal.alfares.cz',
    target: 'warehouse-microservice',
    tokenEnv: 'WAREHOUSE_SERVICE_TOKEN',
    url: () => `${WAREHOUSE_URL}/api/stock/credential-probe`,
  },
];

/**
 * Reports this service's credentials, per
 * `monitoring-microservice/docs/CREDENTIAL_SELF_REPORT_CONTRACT.md`.
 *
 * Wave 3 of the prober plan's Task A. Unlike the earlier waves, this repo builds
 * with plain `tsc` and has no nest-cli asset copier, so the vendored `.js` is
 * copied into `dist/` by a `postbuild` step in package.json. Without it the file
 * is absent from the image and the pod throws MODULE_NOT_FOUND at boot — the
 * failure that crashlooped invoices-microservice on 2026-09-03.
 */
@Injectable()
export class CredentialSelfReporter {
  constructor(private readonly logger: LoggerService) {}

  @Cron(SELF_REPORT_CRON)
  async scheduledReport(): Promise<void> {
    if (process.env.CREDENTIAL_SELF_REPORT_ENABLED === 'false') return;
    await this.runReport();
  }

  async runReport(): Promise<Array<{ principal: string; verdict: string; posted: boolean }>> {
    const ingestToken = (process.env.NOTIFICATION_SERVICE_TOKEN || '').trim();

    if (!ingestToken) {
      // A reporter that stops reporting is indistinguishable from a credential
      // that broke, and silence is this design's primary signal. Say so loudly.
      this.logger.error(
        'credential_self_report_undeliverable: NOTIFICATION_SERVICE_TOKEN is empty',
        undefined,
        'CredentialSelfReporter',
      );
      return [];
    }

    const results = [];
    for (const lane of LANES) {
      const token = (process.env[lane.tokenEnv] || '').trim();

      const outcome = await reporter.reportCredential({
        url: lane.url(),
        token,
        serviceName: 'aukro-service',
        monitoringUrl: MONITORING_URL,
        ingestToken,
        principal: lane.principal,
        target: lane.target,
      });

      this.logger.log(
        `credential_self_report_sent principal=${lane.principal} target=${lane.target} ` +
          `verdict=${outcome.verdict} posted=${outcome.posted}` +
          (outcome.error ? ` error=${outcome.error}` : ''),
        'CredentialSelfReporter',
      );

      if (!outcome.posted) {
        this.logger.warn(
          `probe said ${outcome.verdict} but the report was not accepted` +
            (outcome.error ? `: ${outcome.error}` : ''),
          'CredentialSelfReporter',
        );
      }

      results.push({ principal: lane.principal, verdict: outcome.verdict, posted: outcome.posted });
    }

    return results;
  }
}
