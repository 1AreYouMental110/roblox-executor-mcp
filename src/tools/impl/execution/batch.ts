import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sendAndWait } from "../../factory.js";
import { threadContextSchema } from "../../schemas.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "batch",
    {
      title: "Run multiple Luau snippets in one round-trip",
      description:
        "Execute several independent Luau snippets in a single bridge round-trip. Each snippet runs in its own pcall; the tool returns an array of { ok, result } per snippet (result = the snippet's first returned value, or nil). Use this instead of many execute/get-data-by-code calls when steps are independent.",
      inputSchema: z.object({
        snippets: z
          .array(z.string())
          .min(1)
          .describe(
            "Luau snippets to run in order. Each may `return` a value; returned values are serialized automatically (do not JSONEncode).",
          ),
        threadContext: threadContextSchema,
        timeout: z
          .number()
          .describe("Timeout in milliseconds (default: 15000, max: 120000).")
          .optional()
          .default(15000),
      }),
    },
    async ({ snippets, threadContext, timeout }) => {
      const clampedTimeout = Math.min(Math.max(timeout, 1000), 120000);
      const fns = snippets.map((c) => `function()\n${c}\nend`).join(",\n");
      const source =
        `setthreadidentity(${threadContext});` +
        `local __s={${fns}};` +
        `local __r={};` +
        `for __i,__fn in ipairs(__s) do local ok,res=pcall(__fn); __r[__i]={ok=ok,result=res} end;` +
        `return __r`;

      return sendAndWait({
        type: "get-data-by-code",
        data: { source },
        timeoutMs: clampedTimeout,
        failureMessage: (response) =>
          "Failed to run batch. Response: " + JSON.stringify(response),
      });
    },
  );
}
