/**
 * The desk's queue: filed wallets are attributed one at a time, on the server.
 *
 * Serial on purpose — the chain clients pace themselves, and a parallel
 * fan-out collects rate-limit refusals that read exactly like an empty
 * wallet. The queue is the desk file itself: an entry is `pending` until its
 * record is written, so a restart loses nothing; the next kick picks up where
 * the last run stopped.
 *
 * A wallet that could not be read is read again by the worker itself: the desk
 * gives it a time (`lib/desk.ts`), and the worker wakes for it. Bounded there,
 * so a chain that stays silent costs three reads and no more; the wallet stays
 * unreadable, never empty.
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
  /**
   * Queue the unreadable wallets whose retry time has come, and say when the
   * next one is due (epoch ms), or null when none is waiting. Without it the
   * worker never retries by itself.
   */
  requeueDue?(): Promise<number | null>;
  /** The clock, and how to be woken after a delay; injected by tests. */
  now?(): number;
  schedule?(delayMs: number, run: () => void): void;
}

export interface Worker {
  /** Resolves when the queue is empty. Concurrent kicks join the running loop. */
  kick(): Promise<void>;
}

/** A timer that does not keep the process alive: a server shutting down is not held open by a retry. */
function wakeAfter(delayMs: number, run: () => void): void {
  const timer = setTimeout(run, delayMs);
  if (typeof timer === "object" && timer !== null && "unref" in timer) timer.unref();
}

export function createWorker(deps: WorkerDeps): Worker {
  let running: Promise<void> | null = null;
  let again = false;
  /** When the armed wake-up fires (epoch ms), or null: one timer at a time, never one per wallet. */
  let armedFor: number | null = null;
  const now = deps.now ?? Date.now;
  const schedule = deps.schedule ?? wakeAfter;

  function arm(dueAt: number) {
    if (armedFor !== null && armedFor <= dueAt) return;
    armedFor = dueAt;
    schedule(Math.max(0, dueAt - now()), () => {
      armedFor = null;
      kick().catch((err) => console.warn("[desk] retry stopped:", err instanceof Error ? err.message : err));
    });
  }

  async function drain() {
    for (;;) {
      again = false;
      // Wallets whose time has come join the queue; `wake` is when the next one is due.
      const wake = deps.requeueDue ? await deps.requeueDue() : null;
      let worked = false;
      for (let next = await deps.nextPending(); next; next = await deps.nextPending()) {
        worked = true;
        let result: { record: AttributionRecord } | { error: string };
        try {
          result = { record: await deps.attribute(next.wallet, next.chain) };
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "Attribution failed." };
        }
        await deps.save(next.id, result);
      }
      // After any work, look once more: a read may have scheduled a retry, or a kick may have arrived.
      if (worked || again) continue;
      if (wake !== null) arm(wake);
      return;
    }
  }

  function kick(): Promise<void> {
    if (running) {
      again = true;
      return running;
    }
    running = drain().finally(() => {
      running = null;
    });
    return running;
  }

  return { kick };
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
    async requeueDue() {
      const [{ changeDesk, loadDesk }, { nextRetryAt, requeueDue }] = await Promise.all([import("./desk-store"), import("./desk")]);
      const at = new Date().toISOString();
      // The file is written only when a wallet is actually due: an idle worker leaves the desk untouched.
      const due = (await loadDesk()).entries.some((e) => e.status === "unreadable" && typeof e.retryAt === "string" && e.retryAt <= at);
      const next = due
        ? await changeDesk((file) => {
            requeueDue(file, at);
            return nextRetryAt(file);
          })
        : nextRetryAt(await loadDesk());
      return next === null ? null : Date.parse(next);
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
