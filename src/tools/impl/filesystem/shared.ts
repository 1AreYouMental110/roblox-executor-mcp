import { sendAndWait, type ToolTextResponse } from "../../factory.js";

/**
 * Escape an arbitrary string into a safe Lua double-quoted string literal.
 * Control bytes use 3-digit `\ddd` escapes so a following digit can't extend
 * the escape, making it safe for paths and file contents alike.
 */
export function luaString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const code = s.charCodeAt(i);
    if (c === '"') out += '\\"';
    else if (c === "\\") out += "\\\\";
    else if (c === "\n") out += "\\n";
    else if (c === "\r") out += "\\r";
    else if (c === "\t") out += "\\t";
    else if (code < 32 || code === 127) out += "\\" + String(code).padStart(3, "0");
    else out += c;
  }
  return out + '"';
}

/**
 * Run a Luau snippet (that returns values) through the existing get-data-by-code
 * channel at thread identity 8 — no new wire protocol needed. Filesystem globals
 * (readfile/writefile/...) are checked first so a missing one yields a clear error
 * instead of "attempt to call a nil value".
 */
export async function runFsLua(
  required: string,
  source: string,
  successMessage?: (output: string) => string,
  timeoutMs = 15000
): Promise<ToolTextResponse> {
  const guard = `assert(type(${required})=="function","executor missing '${required}' (filesystem unsupported)")`;
  return sendAndWait({
    type: "get-data-by-code",
    data: { source: `setthreadidentity(8);${guard};${source}` },
    timeoutMs,
    successMessage: successMessage ? (r) => successMessage(r.output as string) : undefined,
    failureMessage: (r) => `Filesystem operation failed. Response: ${JSON.stringify(r)}`,
  });
}
