import type { IncomingMessage, ServerResponse } from "http";
import { getClientById } from "../../bridge/handlers/shared/registry.js";
import { HTTP_POLL_TIMEOUT } from "../../config.js";

// Each queued command is already a JSON string, so a batch is just a JSON array
// of those objects. The connector accepts either a single object or an array.
function sendBatch(res: ServerResponse, batch: string[]): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end("[" + batch.join(",") + "]");
}

export function GET(req: IncomingMessage, res: ServerResponse, url: URL): void {
  const clientId = url.searchParams.get("clientId");
  if (!clientId) {
    res.writeHead(400);
    res.end("Missing clientId query parameter");
    return;
  }

  const client = getClientById(clientId);
  if (!client) {
    res.writeHead(404);
    res.end("Unknown clientId");
    return;
  }

  client.lastHttpPoll = Date.now();

  // Fast path: deliver anything already queued without waiting.
  if (client.pendingHttpCommands.length > 0) {
    const batch = client.pendingHttpCommands;
    client.pendingHttpCommands = [];
    sendBatch(res, batch);
    return;
  }

  // Slow path: hold the request open (long-poll) until a command is queued or
  // HTTP_POLL_TIMEOUT elapses. This gives near-WebSocket latency without the
  // client busy-polling; SendToClient flushes us the instant work arrives.
  if (client.pendingPollResolve) {
    // A stale waiter shouldn't exist (the client polls serially), but if one
    // does, retire it so it can't leak — the older request will time out.
    client.pendingPollResolve = null;
  }

  let done = false;
  const finish = (commands: string[] | null): void => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (client.pendingPollResolve === waiter) client.pendingPollResolve = null;
    if (!commands || commands.length === 0) {
      res.writeHead(204);
      res.end();
    } else {
      sendBatch(res, commands);
    }
  };

  const timer = setTimeout(() => finish(null), HTTP_POLL_TIMEOUT);
  const waiter = (commands: string[]): void => finish(commands);
  client.pendingPollResolve = waiter;

  // If the client hangs up mid-hold, drop the waiter so it can't leak.
  req.on("close", () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (client.pendingPollResolve === waiter) client.pendingPollResolve = null;
  });
}
