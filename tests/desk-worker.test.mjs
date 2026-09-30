import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorker } from "../lib/desk-worker.ts";

function fakeDesk(ids) {
  const pending = [...ids];
  const saved = [];
  let attributing = 0;
  let most = 0;
  return {
    saved,
    most: () => most,
    deps: {
      async nextPending() {
        const id = pending.shift();
        return id ? { id, wallet: `W${id}`, chain: "tron" } : null;
      },
      async attribute(wallet) {
        attributing += 1;
        most = Math.max(most, attributing);
        await new Promise((r) => setTimeout(r, 5));
        attributing -= 1;
        if (wallet === "Wbad") throw new Error("socket hang up");
        return { wallet };
      },
      async save(id, result) {
        saved.push([id, "record" in result ? "record" : result.error]);
      },
    },
    add: (id) => pending.push(id),
  };
}

test("the worker drains every pending entry, one at a time", async () => {
  const desk = fakeDesk(["1", "2", "3"]);
  const worker = createWorker(desk.deps);
  await Promise.all([worker.kick(), worker.kick(), worker.kick()]);
  assert.deepEqual(desk.saved.map(([id]) => id), ["1", "2", "3"]);
  assert.equal(desk.most(), 1);
});

test("a failure is saved as the entry's error and the queue moves on", async () => {
  const desk = fakeDesk(["bad", "2"]);
  await createWorker(desk.deps).kick();
  assert.deepEqual(desk.saved, [["bad", "socket hang up"], ["2", "record"]]);
});

test("work filed while the worker runs is picked up by the same run", async () => {
  const desk = fakeDesk(["1"]);
  const worker = createWorker(desk.deps);
  const run = worker.kick();
  desk.add("2");
  await worker.kick();
  await run;
  assert.deepEqual(desk.saved.map(([id]) => id), ["1", "2"]);
});
