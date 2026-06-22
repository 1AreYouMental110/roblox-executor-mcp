import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { luaString, runFsLua } from "./shared.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "write-file",
    {
      title: "Write a file to the executor workspace",
      description:
        "Write (overwrite) a file in the executor's workspace folder via writefile. Creates the file if missing. Use append-file to add without overwriting.",
      inputSchema: z.object({
        path: z.string().describe("Path relative to the executor workspace folder."),
        content: z.string().describe("Full text content to write."),
      }),
    },
    async ({ path, content }) =>
      runFsLua(
        "writefile",
        `writefile(${luaString(path)}, ${luaString(content)}); return ("wrote %d bytes to %s"):format(${content.length}, ${luaString(path)})`,
      ),
  );
}
