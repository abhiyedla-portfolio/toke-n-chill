// @ts-ignore `.open-next/worker.js` is generated at build time.
import { default as nextWorker } from './.open-next/worker.js';
import { syncCatalogFromClover } from './src/lib/server/clover-sync';
import { generateAndSendReport } from './src/lib/server/inventory-report';
import { runOpsCheck } from './src/lib/server/ops-checker';
import type { D1DatabaseLike } from './src/lib/server/catalog-db';

interface WorkerEnv {
  CATALOG_DB?: D1DatabaseLike;
}

interface WorkerContextLike {
  waitUntil: (promise: Promise<unknown>) => void;
}

interface ScheduledControllerLike {
  cron: string;
}

// ── Cron schedules (all times UTC) ───────────────────────────
// Friday 11 PM UTC = Friday 6 PM CDT (UTC-5, Mar–Nov).
const INVENTORY_REPORT_CRON = '0 23 * * 5';

// Ops check every 5 minutes during store hours (CDT = UTC-5, CST = UTC-6).
// Store hours ~10 AM–9 PM CST → roughly UTC 15:00–03:00.
// Two triggers cover the window (Cloudflare 5-field cron can't span midnight in one rule):
//   '*/5 14-23 * * *' → every 5 min, 2 PM–midnight UTC  (~9 AM–7 PM CDT)
//   '*/5 0-4 * * *'   → every 5 min, midnight–4 AM UTC  (~7 PM–11 PM CDT)
const OPS_CHECK_CRON_A = '*/5 14-23 * * *';
const OPS_CHECK_CRON_B = '*/5 0-4 * * *';

const worker = {
  fetch: nextWorker.fetch,

  async scheduled(
    controller: ScheduledControllerLike,
    env: WorkerEnv,
    ctx: WorkerContextLike,
  ) {
    // ── Weekly inventory report ──
    if (controller.cron === INVENTORY_REPORT_CRON) {
      if (!env.CATALOG_DB) {
        console.error('[InventoryReport] CATALOG_DB binding is missing — skipping report.');
        return;
      }
      ctx.waitUntil(
        generateAndSendReport(env.CATALOG_DB).catch((error) => {
          console.error('[InventoryReport] Scheduled report failed.', error);
        }),
      );
      return;
    }

    // ── Ops check (open/close + attendance) ──
    if (controller.cron === OPS_CHECK_CRON_A || controller.cron === OPS_CHECK_CRON_B) {
      if (!env.CATALOG_DB) {
        console.error('[OpsChecker] CATALOG_DB binding is missing — skipping ops check.');
        return;
      }
      ctx.waitUntil(
        runOpsCheck(env.CATALOG_DB).catch((error) => {
          console.error('[OpsChecker] Ops check failed.', error);
        }),
      );
      return;
    }

    // ── Default: catalog sync (every 10 min) ──
    ctx.waitUntil(
      syncCatalogFromClover(env.CATALOG_DB, { triggeredBy: 'cron' }).catch((error) => {
        console.error(`[CloverSync] Scheduled sync failed for cron "${controller.cron}".`, error);
        throw error;
      }),
    );
  },
};

export default worker;
