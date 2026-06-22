import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { luaString, runFsLua } from "./shared.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "read-file",
    {
      title: "Read a file from the executor workspace",
      description:
        "Read a file from the executor's workspace folder via readfile. Path is relative to the executor workspace (e.g. 'autoexec/foo.lua' or 'myscript.txt').",
      inputSchema: z.object({
        path: z.string().describe("Path relative to the executor workspace folder."),
      }),
    },
    async ({ path }) =>
      runFsLua("readfile", `return readfile(${luaString(path)})`),
  );
}
