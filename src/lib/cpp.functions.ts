import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Compiles and runs C++ in Compiler Explorer's isolated sandbox. Datasets arrive on stdin.
// ANSI escape sequences returned by the compiler.
// eslint-disable-next-line no-control-regex
const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

export const runCpp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().max(100_000), stdin: z.string().max(500_000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const t = Date.now();
    try {
      const res = await fetch("https://godbolt.org/api/compiler/g132/compile", {
        method: "POST",
        signal: AbortSignal.timeout(20000),
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          source: data.code,
          options: {
            userArguments: "-O2 -std=c++20",
            executeParameters: { args: [], stdin: data.stdin },
            compilerOptions: { executorRequest: true },
            filters: { execute: true },
            tools: [],
          },
        }),
      });
      if (!res.ok)
        return {
          logs: [
            {
              kind: "error" as const,
              text: `Compiler service unavailable (${res.status}). Try again in a moment.`,
            },
          ],
          ms: Date.now() - t,
          timedOut: false,
        };
      const r = (await res.json()) as {
        stdout?: { text: string }[];
        stderr?: { text: string }[];
        timedOut?: boolean;
        code?: number;
        buildResult?: { code: number; stderr?: { text: string }[] };
      };
      const logs: { kind: "log" | "error"; text: string }[] = [];
      if (r.buildResult && r.buildResult.code !== 0) {
        logs.push({
          kind: "error",
          text:
            strip((r.buildResult.stderr || []).map((l) => l.text).join("\n")) ||
            "Compilation failed",
        });
      } else {
        const out = (r.stdout || []).map((l) => l.text).join("\n");
        if (out) logs.push({ kind: "log", text: out });
        const err = (r.stderr || []).map((l) => l.text).join("\n");
        if (err) logs.push({ kind: "error", text: strip(err) });
        if (r.code && r.code !== 0)
          logs.push({ kind: "error", text: `Program exited with code ${r.code}` });
      }
      return { logs, ms: Date.now() - t, timedOut: !!r.timedOut };
    } catch {
      return {
        logs: [
          {
            kind: "error" as const,
            text: "Could not reach the C++ compiler. Check your connection and try again.",
          },
        ],
        ms: Date.now() - t,
        timedOut: false,
      };
    }
  });
