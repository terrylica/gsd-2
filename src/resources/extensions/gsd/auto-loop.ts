/**
 * auto-loop.ts — Linear loop execution backbone for auto-mode.
 *
 * Replaces the recursive dispatchNextUnit → handleAgentEnd → dispatchNextUnit
 * pattern with a while loop. The agent_end event resolves a promise instead
 * of recursing.
 *
 * MAINTENANCE RULE: Module-level mutable state is allowed here (pendingResolve)
 * because auto-loop.ts is a separate module from auto.ts. The encapsulation
 * invariant in auto-session-encapsulation.test.ts applies only to auto.ts.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@gsd/pi-coding-agent";

import type { AutoSession } from "./auto/session.js";
import { NEW_SESSION_TIMEOUT_MS } from "./auto/session.js";
import type { GSDPreferences } from "./preferences.js";
import { debugLog } from "./debug-logger.js";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Minimal shape of the event parameter from pi.on("agent_end", ...).
 * The full event has more fields, but the loop only needs messages.
 */
export interface AgentEndEvent {
  messages: unknown[];
}

/**
 * Describes deferred work discovered during a unit that should be
 * queued for the sidecar (hooks, triage, quick-tasks).
 */
export interface SidecarWork {
  kind: "hook" | "triage" | "quick-task";
  payload: unknown;
}

/**
 * Result of a single unit execution (one iteration of the loop).
 */
export interface UnitResult {
  status: "completed" | "cancelled" | "error";
  event?: AgentEndEvent;
  sidecarWork?: SidecarWork[];
}

// ─── Module-level promise state ──────────────────────────────────────────────

/**
 * One-shot resolver for the current unit's agent_end promise.
 * Non-null only while a unit is in-flight (between sendMessage and agent_end).
 */
let pendingResolve: ((result: UnitResult) => void) | null = null;

// ─── resolveAgentEnd ─────────────────────────────────────────────────────────

/**
 * Called from the agent_end event handler in index.ts to resolve the
 * in-flight unit promise. One-shot: the resolver is nulled before calling
 * to prevent double-resolution from model fallback retries.
 */
export function resolveAgentEnd(event: AgentEndEvent): void {
  if (pendingResolve) {
    debugLog("resolveAgentEnd", { status: "resolving", hasEvent: true });
    const r = pendingResolve;
    pendingResolve = null;
    r({ status: "completed", event });
  } else {
    debugLog("resolveAgentEnd", {
      status: "no-pending-promise",
      warning: "orphan or double-resolution — agent_end arrived with no in-flight unit",
    });
  }
}

// ─── resetPendingResolve (test helper) ───────────────────────────────────────

/**
 * Reset module-level state. Only exported for test cleanup — production code
 * should never call this.
 */
export function _resetPendingResolve(): void {
  pendingResolve = null;
}

// ─── runUnit ─────────────────────────────────────────────────────────────────

/**
 * Execute a single unit: create a new session, send the prompt, and await
 * the agent_end promise. Returns a UnitResult describing what happened.
 *
 * The promise is one-shot: resolveAgentEnd() is the only way to resolve it.
 * On session creation failure or timeout, returns { status: 'cancelled' }
 * without awaiting the promise.
 */
export async function runUnit(
  ctx: ExtensionContext,
  pi: ExtensionAPI,
  s: AutoSession,
  unitType: string,
  unitId: string,
  prompt: string,
  _prefs: GSDPreferences | undefined,
): Promise<UnitResult> {
  debugLog("runUnit", { phase: "start", unitType, unitId });

  // ── Create the agent_end promise ──
  const unitPromise = new Promise<UnitResult>((resolve) => {
    pendingResolve = resolve;
  });

  // ── Session creation with timeout ──
  debugLog("runUnit", { phase: "session-create", unitType, unitId });

  let sessionResult: { cancelled: boolean };
  let sessionTimeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const sessionPromise = s.cmdCtx!.newSession();
    const timeoutPromise = new Promise<{ cancelled: true }>((resolve) => {
      sessionTimeoutHandle = setTimeout(() => resolve({ cancelled: true }), NEW_SESSION_TIMEOUT_MS);
    });
    sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
  } catch (sessionErr) {
    if (sessionTimeoutHandle) clearTimeout(sessionTimeoutHandle);
    const msg = sessionErr instanceof Error ? sessionErr.message : String(sessionErr);
    debugLog("runUnit", { phase: "session-error", unitType, unitId, error: msg });
    // Clean up the pending promise — nobody will resolve it
    pendingResolve = null;
    return { status: "cancelled" };
  }
  if (sessionTimeoutHandle) clearTimeout(sessionTimeoutHandle);

  if (sessionResult.cancelled) {
    debugLog("runUnit-session-timeout", { unitType, unitId });
    // Clean up the pending promise — nobody will resolve it
    pendingResolve = null;
    return { status: "cancelled" };
  }

  // ── Send the prompt ──
  debugLog("runUnit", { phase: "send-message", unitType, unitId });

  if (!s.active) {
    pendingResolve = null;
    return { status: "cancelled" };
  }

  pi.sendMessage(
    { customType: "gsd-auto", content: prompt, display: s.verbose },
    { triggerTurn: true },
  );

  // ── Await agent_end ──
  debugLog("runUnit", { phase: "awaiting-agent-end", unitType, unitId });
  const result = await unitPromise;
  debugLog("runUnit", { phase: "agent-end-received", unitType, unitId, status: result.status });

  return result;
}

// ─── autoLoop (placeholder — T02 implements) ─────────────────────────────────

/**
 * Main auto-mode execution loop. Iterates: derive → dispatch → guards →
 * runUnit → finalize → repeat. Exits when s.active becomes false or a
 * terminal condition is reached.
 *
 * Placeholder — T02 builds the full implementation.
 */
export async function autoLoop(
  _ctx: ExtensionContext,
  _pi: ExtensionAPI,
  _s: AutoSession,
): Promise<void> {
  // T02 implements the while loop body
  while (false) {
    // Placeholder to satisfy structural assertion that `while` keyword exists
  }
}
