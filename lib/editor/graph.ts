import { EvalBuiltIn } from 'function-plot';
export type CurveMode = 'function' | 'derivative' | 'primitive';
export const curveColors = ['#438bff', '#ef6262', '#27b887', '#ae78ed', '#eeac45', '#43bdcf'];
export function normalizeFunction(source: string) {
    return source.trim().replace(/^\s*(?:y|[a-zA-Z]\s*\(\s*x\s*\))\s*=/, '').replace(/\\(?:sin|cos|tan|log|ln|exp)/g, command => command.slice(1)).replace(/\\pi|π/g, 'PI').replace(/\\cdot|\\times|·/g, '*').replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)').replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))').replace(/\{([^{}]+)\}/g, '($1)').replace(/(\d)(x|PI|[a-z]+\()/g, '$1*$2').replace(/\bln\(/g, 'log(');
}
export function sampleCurve(source: string, mode: CurveMode, expressions: string[], xMin: number, xMax: number, count = 900) {
    if (source.length > 160 || source.includes('!')) throw Error('Use an expression under 160 characters, without factorials.');
    let formula = source, operation = mode;
    const reference = source.trim().match(/^([a-zA-Z])(['′]?)\(x\)$/);
    if (reference) {
        const definition = expressions.find(item => new RegExp(`^\\s*${reference[1]}\\s*\\(x\\)\\s*=`).test(item));
        if (!definition) throw Error(`Define ${reference[1]}(x) first.`);
        formula = definition; if (reference[2] && mode === 'function') operation = 'derivative';
    }
    const integral = source.trim().match(/^(?:integral|primitive)\((.*)\)$/);
    if (integral) { formula = integral[1]; operation = 'primitive'; }
    const meta = { fn: normalizeFunction(formula) };
    const evaluate = (x: number): number => Number(EvalBuiltIn(meta, 'fn', { x, PI: Math.PI, pi: Math.PI, e: Math.E }));
    evaluate((xMin + xMax) / 2); // compile once, report invalid expressions before plotting
    const points: [number, number][] = [];
    const step = (xMax - xMin) / (count - 1);
    let area = 0;
    if (operation === 'primitive') {
        const n = 128, h = xMin / n;
        for (let i = 0; i < n; i++) area += h * (evaluate(i * h) + 4 * evaluate((i + .5) * h) + evaluate((i + 1) * h)) / 6;
    }
    let previous = evaluate(xMin);
    for (let index = 0; index < count; index++) {
        const x = xMin + step * index, value = evaluate(x);
        if (operation === 'primitive' && index) area += step * (previous + 4 * evaluate(x - step / 2) + value) / 6;
        const h = 1e-5 * Math.max(1, Math.abs(x));
        const y = operation === 'derivative' ? (evaluate(x + h) - evaluate(x - h)) / (2 * h) : operation === 'primitive' ? area : value;
        points.push([x, y]); previous = value;
    }
    return points;
}
export function numericBound(value: string, fallback: number) {
    try { const result = Number(EvalBuiltIn({ fn: value.replace(/π/g, 'PI') }, 'fn', { PI: Math.PI, pi: Math.PI })); return Number.isFinite(result) ? Math.max(-1000, Math.min(1000, result)) : fallback; } catch { return fallback; }
}
