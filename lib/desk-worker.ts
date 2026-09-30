/**
 * The desk's queue: filed wallets are attributed one at a time, on the server.
 *
 * Serial on purpose — the chain clients pace themselves, and a parallel
 * fan-out collects rate-limit refusals that read exactly like an empty
 * wallet. The queue is the desk file itself: an entry is `pending` until its
 * record is written, so a restart loses nothing; the next kick picks up where
 * the last run stopped.
 *
 * One loop per server. The singleton lives on `globalThis` because Next
 * bundles `instrumentation.ts` and the route handlers separately, and a
 * module-level loop would exist twice.
 *
 * Server-only.
 */

import type { AttributionRecord, EntryChain } from "./desk-types";

export interface WorkerDeps {
  nextPending(): Promise<{ id: string; wallet: string; chain: EntryChain } | null>;
  attribute(wallet: string, chain: EntryChain): Promise<AttributionRecord>;
  save(id: string, result: { record: AttributionRecord } | { error: string }): Promise<void>;
}

export interface Worker {
  /** Resolves when the queue is empty. Concurrent kicks join the running loop. */
  kick(): Promise<void>;
}

export function createWorker(deps: WorkerDeps): Worker {
  let running: Promise<void> | null = null;
  let again = false;

  async function drain() {
    do {
      again = false;
      for (let next = await deps.nextPending(); next; next = await deps.nextPending()) {
        let result: { record: AttributionRecord } | { error: string };
        try {
          result = { record: await deps.attribute(next.wallet, next.chain) };
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "Attribution failed." };
        }
        await deps.save(next.id, result);
      }
    } while (again);
  }

  return {
    kick() {
      if (running) {
        again = true;
        return running;
      }
      running = drain().finally(() => {
        running = null;
      });
      return running;
    },
  };
}

/** The server's one desk worker, wired to the desk file and the chain. */
export function deskWorker(): Worker {
  const holder = globalThis as typeof globalThis & { __noirDeskWorker?: Worker };
  holder.__noirDeskWorker ??= createWorker({
    async nextPending() {
      const { loadDesk } = await import("./desk-store");
      const entry = (await loadDesk()).entries.find((e) => e.status === "pending");
      return entry ? { id: entry.id, wallet: entry.wallet, chain: entry.chain } : null;
    },
    async attribute(wallet, chain) {
      const { attributeWallet } = await import("./attribute");
      return attributeWallet(wallet, chain);
    },
    async save(id, result) {
      const [{ changeDesk }, { setRecord }] = await Promise.all([import("./desk-store"), import("./desk")]);
      await changeDesk((file) => setRecord(file, id, result, new Date().toISOString()));
    },
  });
  return holder.__noirDeskWorker;
}

/** Start draining without waiting for it; failures go to the server log. */
export function kickDesk(): void {
  deskWorker()
    .kick()
    .catch((err) => console.warn("[desk] worker stopped:", err instanceof Error ? err.message : err));
}
