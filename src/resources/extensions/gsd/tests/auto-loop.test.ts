import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  resolveAgentEnd,
  runUnit,
  autoLoop,
  _resetPendingResolve,
  type UnitResult,
  type AgentEndEvent,
} from "../auto-loop.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(messages: unknown[] = [{ role: "assistant" }]): AgentEndEvent {
  return { messages };
}

/**
 * Build a minimal mock AutoSession with controllable newSession behavior.
 */
function makeMockSession(opts?: {
  newSessionResult?: { cancelled: boolean };
  newSessionThrows?: string;
  newSessionDelayMs?: number;
}) {
  return {
    active: true,
    verbose: false,
    cmdCtx: {
      newSession: () => {
        if (opts?.newSessionThrows) {
          return Promise.reject(new Error(opts.newSessionThrows));
        }
        const result = opts?.newSessionResult ?? { cancelled: false };
        const delay = opts?.newSessionDelayMs ?? 0;
        if (delay > 0) {
          return new Promise<{ cancelled: boolean }>((res) =>
            setTimeout(() => res(result), delay),
          );
        }
        return Promise.resolve(result);
      },
    },
    clearTimers: () => {},
  } as any;
}

/**
 * Build a minimal mock ExtensionContext.
 */
function makeMockCtx() {
  return {
    ui: { notify: () => {} },
    model: { id: "test-model" },
  } as any;
}

/**
 * Build a minimal mock ExtensionAPI that records sendMessage calls.
 */
function makeMockPi() {
  const calls: unknown[] = [];
  return {
    sendMessage: (...args: unknown[]) => { calls.push(args); },
    calls,
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test("resolveAgentEnd resolves a pending runUnit promise", async () => {
  _resetPendingResolve();

  const ctx = makeMockCtx();
  const pi = makeMockPi();
  const s = makeMockSession();
  const event = makeEvent();

  // Start runUnit — it will create the promise and send a message,
  // then block awaiting agent_end
  const resultPromise = runUnit(ctx, pi, s, "task", "T01", "do stuff", undefined);

  // Give the microtask queue a tick so runUnit reaches the await
  await new Promise((r) => setTimeout(r, 10));

  // Now resolve the agent_end
  resolveAgentEnd(event);

  const result = await resultPromise;
  assert.equal(result.status, "completed");
  assert.deepEqual(result.event, event);
});

test("resolveAgentEnd is safe when no promise is pending (no-op)", () => {
  _resetPendingResolve();

  // Should not throw — just logs a debug warning
  assert.doesNotThrow(() => {
    resolveAgentEnd(makeEvent());
  });
});

test("double resolveAgentEnd only resolves once", async () => {
  _resetPendingResolve();

  const ctx = makeMockCtx();
  const pi = makeMockPi();
  const s = makeMockSession();
  const event1 = makeEvent([{ id: 1 }]);
  const event2 = makeEvent([{ id: 2 }]);

  const resultPromise = runUnit(ctx, pi, s, "task", "T01", "prompt", undefined);

  await new Promise((r) => setTimeout(r, 10));

  // First resolve — should work
  resolveAgentEnd(event1);

  // Second resolve — should be a no-op (orphan)
  assert.doesNotThrow(() => {
    resolveAgentEnd(event2);
  });

  const result = await resultPromise;
  assert.equal(result.status, "completed");
  // Should have the first event, not the second
  assert.deepEqual(result.event, event1);
});

test("runUnit returns cancelled when session creation fails", async () => {
  _resetPendingResolve();

  const ctx = makeMockCtx();
  const pi = makeMockPi();
  const s = makeMockSession({ newSessionThrows: "connection refused" });

  const result = await runUnit(ctx, pi, s, "task", "T01", "prompt", undefined);

  assert.equal(result.status, "cancelled");
  assert.equal(result.event, undefined);
  // sendMessage should NOT have been called
  assert.equal(pi.calls.length, 0);
});

test("runUnit returns cancelled when session creation times out", async () => {
  _resetPendingResolve();

  const ctx = makeMockCtx();
  const pi = makeMockPi();
  // Session returns cancelled: true (simulates the timeout race outcome)
  const s = makeMockSession({ newSessionResult: { cancelled: true } });

  const result = await runUnit(ctx, pi, s, "task", "T01", "prompt", undefined);

  assert.equal(result.status, "cancelled");
  assert.equal(result.event, undefined);
  assert.equal(pi.calls.length, 0);
});

test("runUnit returns cancelled when s.active is false before sendMessage", async () => {
  _resetPendingResolve();

  const ctx = makeMockCtx();
  const pi = makeMockPi();
  const s = makeMockSession();
  s.active = false;

  const result = await runUnit(ctx, pi, s, "task", "T01", "prompt", undefined);

  assert.equal(result.status, "cancelled");
  assert.equal(pi.calls.length, 0);
});

// ─── Structural assertions ───────────────────────────────────────────────────

test("auto-loop.ts exports autoLoop, runUnit, resolveAgentEnd", async () => {
  const mod = await import("../auto-loop.js");
  assert.equal(typeof mod.autoLoop, "function", "autoLoop should be exported as a function");
  assert.equal(typeof mod.runUnit, "function", "runUnit should be exported as a function");
  assert.equal(typeof mod.resolveAgentEnd, "function", "resolveAgentEnd should be exported as a function");
});

test("auto-loop.ts contains a while keyword", () => {
  const src = readFileSync(
    resolve(import.meta.dirname, "..", "auto-loop.ts"),
    "utf-8",
  );
  assert.ok(src.includes("while"), "auto-loop.ts should contain a while keyword (loop or placeholder)");
});

test("auto-loop.ts one-shot pattern: pendingResolve is nulled before calling resolver", () => {
  const src = readFileSync(
    resolve(import.meta.dirname, "..", "auto-loop.ts"),
    "utf-8",
  );
  // The one-shot pattern requires: save ref, null the variable, then call
  // Look for the pattern: pendingResolve = null appearing before r(
  const resolveBlock = src.slice(
    src.indexOf("export function resolveAgentEnd"),
    src.indexOf("export function resolveAgentEnd") + 400,
  );
  const nullIdx = resolveBlock.indexOf("pendingResolve = null");
  const callIdx = resolveBlock.indexOf('r({');
  assert.ok(nullIdx > 0, "should null pendingResolve in resolveAgentEnd");
  assert.ok(callIdx > 0, "should call resolver in resolveAgentEnd");
  assert.ok(nullIdx < callIdx, "pendingResolve should be nulled before calling the resolver (one-shot)");
});
