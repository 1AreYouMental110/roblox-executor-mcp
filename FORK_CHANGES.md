# Fork changes

This is a fork of [notpoiu/roblox-executor-mcp](https://github.com/notpoiu/roblox-executor-mcp)
with throughput, filesystem, and output-safety improvements. Everything below is
additive — existing tools and the WebSocket transport are unchanged.

## 1. HTTP fallback: long-poll + command queue

The HTTP transport (used when the executor has no `WebSocket`) was a short-poll
with a **single** pending-command slot, so it added up to one poll interval of
latency and could silently drop a command when two were dispatched between polls.

- `RobloxClient.pendingHttpCommand: string | null` → `pendingHttpCommands: string[]`
  (a real FIFO queue) plus `pendingPollResolve` for the long-poll waiter.
- `SendToClient` now **enqueues** (never overwrites) and, if a `/poll` request is
  held open, flushes the whole queue to it instantly.
- `/poll` (`src/http/routes/poll.ts`) drains anything queued immediately, otherwise
  **holds the request open** until a command arrives or `HTTP_POLL_TIMEOUT` (10s),
  returning the queue as a JSON array.
- The connector (`connector.luau`) accepts either a single command object **or a
  batch array**, and re-polls immediately after receiving commands (no inter-command
  sleep), only sleeping when it got nothing.

Net: HTTP-mode latency drops to ~WebSocket levels and concurrent/rapid dispatches
no longer drop commands. WebSocket clients are unaffected.

## 2. Filesystem tools

Thin tools over the executor's file API, so the workspace can be managed without
hand-writing Luau. They reuse the existing `get-data-by-code` channel (run at
thread identity 8) — **no new wire protocol** — and assert the underlying global
exists so a missing one returns a clear error.

`read-file`, `write-file`, `append-file`, `list-files`, `delete-file`
(`folder=true` → `delfolder`), `make-folder`. Paths/contents are escaped into safe
Lua string literals (`src/tools/impl/filesystem/shared.ts`).

## 3. `batch` tool

Runs several independent Luau snippets in **one** bridge round-trip, each in its own
`pcall`, returning an array of `{ ok, result }`. Use instead of many
execute/get-data calls when steps are independent. (`src/tools/impl/execution/batch.ts`)

## 4. Output-size guard

Large `get-data-by-code` returns serialized into one payload could blow up the
bridge. The connector's `FormatResponse` now:

- Always enforces a **~2 MB byte cap** (overridable via `maxBytes`), truncating with
  a marker rather than flooding.
- Optionally **clamps before serialization** — `maxDepth` (prune deep tables),
  `maxItems` (cap entries per table), `maxString` (truncate long strings) — with a
  cycle guard. These are opt-in params on `get-data-by-code`; default behavior is
  unchanged apart from the safety byte cap.

## Build / run

Unchanged: `bun install && bun run build`, run with `node dist/index.js`. The
connector is served fresh from `/script.luau`, so clients pick up the connector
changes on next executor launch.
