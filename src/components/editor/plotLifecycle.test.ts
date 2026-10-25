import { Chart } from "function-plot";
import { afterEach, expect, it, vi } from "vitest";
import { mountPlot } from "./plotLifecycle";

afterEach(() => vi.restoreAllMocks());

it("releases each real chart, its listeners and cache entry over repeated render cycles", () => {
  const originalIds = Object.keys(Chart.cache);
  const target = document.createElement("div");
  document.body.append(target);
  try {
    for (let i = 0; i < 20; i++) {
      const dispose = mountPlot(target, {
        width: 400,
        height: 300,
        disableZoom: true,
        data: [{ fn: "x^2" }],
      });
      expect(target.querySelector("svg")).not.toBeNull();
      const id = Object.keys(Chart.cache).find((id) => !originalIds.includes(id))!;
      const chart = Chart.cache[id]!;
      expect(chart.eventNames().length).toBeGreaterThan(0);
      dispose();
      expect(chart.eventNames()).toEqual([]);
      expect(Object.keys(Chart.cache)).toEqual(originalIds);
      expect(target.childNodes.length).toBe(0);
    }
  } finally {
    target.remove();
  }
});

it("cleans up a registered chart when plotting throws without removing another graph", () => {
  const otherTarget = document.createElement("div");
  const target = document.createElement("div");
  const originalIds = Object.keys(Chart.cache);
  const disposeOther = mountPlot(otherTarget, {
    width: 400,
    height: 300,
    disableZoom: true,
    data: [{ fn: "x" }],
  });
  const withOther = Object.keys(Chart.cache);
  const build = vi.spyOn(Chart.prototype, "build").mockImplementation(function (this: Chart) {
    target.append(document.createElement("svg"));
    throw Error("Invalid plot");
  });
  try {
    expect(() => mountPlot(target, { data: [{ fn: "invalid" }] })).toThrow("Invalid plot");
    expect(Object.keys(Chart.cache)).toEqual(withOther);
    expect(target.childNodes.length).toBe(0);
  } finally {
    build.mockRestore();
    disposeOther();
  }
  expect(Object.keys(Chart.cache)).toEqual(originalIds);
});
