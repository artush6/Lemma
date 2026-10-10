import katex from 'katex';
export function mappedLatex(source: string, displayMode: boolean, focus: { start: number; end: number }) {
    let index = 0;
    const annotate = (text: string, start: number, end: number) => {
        const tagged = `\\htmlData{source-start=${start},source-end=${end}}{${text}}`;
        return start < focus.end && end > focus.start ? `\\htmlClass{lemma-active-focus}{${tagged}}` : tagged;
    };
    const walk = (): string => {
        let result = '';
        while (index < source.length) {
            const start = index, char = source[index++];
            if (char === '}') { result += char; break; }
            if (char === '{') { result += char + walk(); continue; }
            if (char === '\\') {
                const command = source.slice(start).match(/^\\[A-Za-z]+|^\\./)?.[0] || char; index = start + command.length;
                if (/^\\(?:begin|end|text|operatorname|mathrm|mathbf|mathbb|mathcal)$/.test(command)) {
                    let end = index; while (/\s/.test(source[end] || '')) end++;
                    if (source[end] === '{') { let depth = 1; end++; while (end < source.length && depth) { if (source[end] === '{') depth++; if (source[end] === '}') depth--; end++; } }
                    const text = source.slice(start, end); index = end; result += /^\\(?:begin|end)$/.test(command) ? text : annotate(text, start, end); continue;
                }
                if (/^\\(?:frac|dfrac|tfrac|binom|sqrt|left|right|limits|nolimits|overline|underline|hat|bar|vec|color|quad|qquad|,|;|!| |\\)$/.test(command)) { result += command; if (/^\\(?:left|right)$/.test(command) && index < source.length) result += source[index++]; continue; }
                result += annotate(command, start, index); continue;
            }
            result += /[\s^_&[\]]/.test(char) ? char : annotate(char, start, index);
        }
        return result;
    };
    try { return katex.renderToString(walk() || '\\;', { displayMode, throwOnError: false, strict: 'ignore', trust: context => context.command === '\\htmlData' || context.command === '\\htmlClass' }); }
    catch { return katex.renderToString(source, { displayMode, throwOnError: false }); }
}
