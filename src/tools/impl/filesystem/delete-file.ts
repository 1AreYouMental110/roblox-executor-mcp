import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { luaString, runFsLua } from "./shared.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "delete-file",
    {
      title: "Delete a file or folder in the executor workspace",
      description:
        "Delete a file (delfile) or folder (delfolder) in the executor's workspace folder. Set folder=true to remove a directory.",
      inputSchema: z.object({
        path: z.string().describe("Path relative to the executor workspace folder."),
        folder: z
          .boolean()
          .describe("Delete a folder (delfolder) instead of a file (delfile).")
          .optional()
          .default(false),
      }),
    },
    async ({ path, folder }) => {
      const fn = folder ? "delfolder" : "delfile";
      return runFsLua(fn, `${fn}(${luaString(path)}); return ("deleted %s"):format(${luaString(path)})`);
    },
  );
}
