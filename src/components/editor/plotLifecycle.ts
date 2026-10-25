import { Chart, type FunctionPlotOptions } from "function-plot";

/** Own the chart before build(), which can throw after registering it in Chart.cache. */
export function mountPlot(target: HTMLElement, options: Omit<FunctionPlotOptions, "target">) {
  const chart = new Chart({ ...options, target });
  const dispose = () => {
    chart.removeAllListeners();
    const id = chart.options.id;
    if (id && Chart.cache[id] === chart) delete Chart.cache[id];
    target.replaceChildren();
  };
  try {
    chart.build();
  } catch (error) {
    dispose();
    throw error;
  }
  return dispose;
}
