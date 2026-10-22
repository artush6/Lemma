import { describe, expect, it } from "vitest";
import { runOutcome, type RunResult } from "./sandbox";

const result = (logs: RunResult["logs"], timedOut = false): RunResult => ({
  logs,
  ms: 4,
  timedOut,
});
describe("Code Lab execution feedback", () => {
  it("distinguishes a quiet successful run from warnings", () => {
    expect(runOutcome(result([]))).toBe("success");
    expect(runOutcome(result([{ kind: "warning", text: "Missing optional data" }]))).toBe(
      "warning",
    );
  });
  it("does not label a failed or timed-out run successful", () => {
    expect(
      runOutcome(
        result([
          { kind: "warning", text: "Warning" },
          { kind: "error", text: "Failed" },
        ]),
      ),
    ).toBe("error");
    expect(runOutcome(result([], true))).toBe("error");
  });
});
