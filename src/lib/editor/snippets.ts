// @ts-nocheck -- ported from the original Lemma codebase, which used looser type settings
export type Snippet = { label: string; template: string };
// Bracketed fields are selected in order, without including the brackets.
export const snippets: Snippet[] = [
  ["sum", "\\sum_{«k=1»}^{«n»} «k»"],
  ["prod", "\\prod_{«k=1»}^{«n»} «k»"],
  ["frac", "\\frac{«a»}{«b»}"],
  ["sqrt", "\\sqrt{«x»}"],
  ["int", "\\int_{«a»}^{«b»} «f(x)»\\,dx"],
  ["lim", "\\lim_{x \\to «a»} «f(x)»"],
  ["vec", "\\vec{«v»}"],
  ["mathbb", "\\mathbb{«R»}"],
  ["mathbf", "\\mathbf{«v»}"],
  ["overline", "\\overline{«x»}"],
  ["underline", "\\underline{«x»}"],
  ["left", "\\left( «x» \\right)"],
  ["right", "\\right)"],
  ["begin{aligned}", "\\begin{aligned}\n«a» &= «b» \\\\\n«c» &= «d»\n\\end{aligned}"],
  ["begin{cases}", "\\begin{cases}\n«x» & «x > 0» \\\\\n«0» & «x \\le 0»\n\\end{cases}"],
  ["begin{pmatrix}", "\\begin{pmatrix} «a» & «b» \\\\ «c» & «d» \\end{pmatrix}"],
  ["begin{bmatrix}", "\\begin{bmatrix} «a» & «b» \\\\ «c» & «d» \\end{bmatrix}"],
  ...[
    "infty",
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "lambda",
    "mu",
    "pi",
    "sigma",
    "theta",
    "forall",
    "exists",
    "in",
    "notin",
    "subset",
    "subseteq",
    "cup",
    "cap",
    "emptyset",
  ].map((s) => [s, `\\${s} `]),
].map(([label, template]) => ({ label: `\\${label}`, template }));
export function expand(template: string, offset: number) {
  const fields: [number, number][] = [];
  let text = "";
  let end = 0;
  for (const match of template.matchAll(/«(.*?)»/g)) {
    text += template.slice(end, match.index);
    const start = text.length;
    text += match[1];
    fields.push([offset + start, offset + text.length]);
    end = match.index! + match[0].length;
  }
  text += template.slice(end);
  return { text, fields };
}
