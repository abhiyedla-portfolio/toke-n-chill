// @ts-ignore `.open-next/worker.js` is generated at build time.
import { default as nextWorker } from './.open-next/worker.js';
import { syncCatalogFromClover } from './src/lib/server/clover-sync';
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

const worker = {
  fetch: nextWorker.fetch,

  async scheduled(
    controller: ScheduledControllerLike,
    env: WorkerEnv,
    ctx: WorkerContextLike,
  ) {
    ctx.waitUntil(
      syncCatalogFromClover(env.CATALOG_DB, { triggeredBy: 'cron' }).catch((error) => {
        console.error(`[CloverSync] Scheduled sync failed for cron "${controller.cron}".`, error);
        throw error;
      }),
    );
  },
};

export default worker;
