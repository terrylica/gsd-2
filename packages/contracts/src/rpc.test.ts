// Project/App: GSD-2
// File Purpose: Tests for canonical RPC contract constants exported by the contracts package.

import assert from "node:assert/strict";
import test from "node:test";
import {
	RPC_COMMAND_TYPES,
	RPC_CONTRACT_VERSION,
	RPC_EXTENSION_UI_METHODS,
	RPC_THINKING_LEVELS,
	RPC_V2_EVENT_TYPES,
	type McpPendingBlocker,
} from "./rpc.js";

test("rpc contract version is stable and public", () => {
	assert.equal(RPC_CONTRACT_VERSION, 1);
});

test("rpc command constants cover the public v2 handshake and core commands", () => {
	assert.deepEqual(
		["init", "prompt", "get_state", "bash", "get_session_stats", "shutdown"].filter(
			(command) => !RPC_COMMAND_TYPES.includes(command as (typeof RPC_COMMAND_TYPES)[number])
		),
		[]
	);
});

test("rpc constants include provider-agnostic thinking and event values", () => {
	assert.deepEqual([...RPC_THINKING_LEVELS], ["off", "minimal", "low", "medium", "high", "xhigh"]);
	assert.deepEqual([...RPC_V2_EVENT_TYPES], ["execution_complete", "cost_update"]);
});

test("extension UI methods include interactive and display update requests", () => {
	assert.deepEqual(
		["select", "confirm", "input", "editor", "notify", "setStatus", "setWidget", "setTitle", "set_editor_text"].filter(
			(method) => !RPC_EXTENSION_UI_METHODS.includes(method as (typeof RPC_EXTENSION_UI_METHODS)[number])
		),
		[]
	);
});

test("mcp pending blocker preserves secure input payloads", () => {
	const blocker: McpPendingBlocker = {
		id: "blocker-1",
		method: "input",
		message: "API key",
		event: {
			type: "extension_ui_request",
			id: "blocker-1",
			method: "input",
			title: "API key",
			secure: true,
		},
	};

	assert.equal(blocker.method, "input");
	assert.equal(blocker.event.method, "input");
	assert.equal(blocker.event.secure, true);
});
