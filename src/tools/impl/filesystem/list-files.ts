import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { luaString, runFsLua } from "./shared.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "list-files",
    {
      title: "List files in an executor workspace folder",
      description:
        "List the entries (files and folders) in an executor workspace folder via listfiles. Pass an empty path to list the workspace root.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Folder path relative to the executor workspace ('' = root).")
          .optional()
          .default(""),
      }),
    },
    async ({ path }) =>
      runFsLua("listfiles", `return listfiles(${luaString(path)})`),
  );
}
