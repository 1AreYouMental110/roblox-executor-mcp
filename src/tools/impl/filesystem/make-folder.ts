import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { luaString, runFsLua } from "./shared.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "make-folder",
    {
      title: "Create a folder in the executor workspace",
      description:
        "Create a folder in the executor's workspace via makefolder (no-op if it already exists).",
      inputSchema: z.object({
        path: z.string().describe("Folder path relative to the executor workspace."),
      }),
    },
    async ({ path }) =>
      runFsLua("makefolder", `makefolder(${luaString(path)}); return ("created folder %s"):format(${luaString(path)})`),
  );
}
