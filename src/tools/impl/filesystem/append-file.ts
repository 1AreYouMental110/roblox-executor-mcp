import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { luaString, runFsLua } from "./shared.js";

export default function register(server: McpServer): void {
  server.registerTool(
    "append-file",
    {
      title: "Append to a file in the executor workspace",
      description:
        "Append text to a file in the executor's workspace folder via appendfile (creates it if missing). Use write-file to overwrite instead.",
      inputSchema: z.object({
        path: z.string().describe("Path relative to the executor workspace folder."),
        content: z.string().describe("Text to append to the end of the file."),
      }),
    },
    async ({ path, content }) =>
      runFsLua(
        "appendfile",
        `appendfile(${luaString(path)}, ${luaString(content)}); return ("appended %d bytes to %s"):format(${content.length}, ${luaString(path)})`,
      ),
  );
}
