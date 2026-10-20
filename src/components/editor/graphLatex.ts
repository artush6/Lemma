/** Convert the scalar LaTeX notation accepted by the graph editor to mathjs syntax. */
export function graphLatex(source: string): string {
  if (source.length > 8000) throw Error("Keep each graph expression below 8,000 characters.");
  const text = source
    .trim()
    .replace(/\$/g, "")
    .replace(/\\(?:left|right|displaystyle|textstyle)\b/g, "")
    .replace(/\\[,;! ]/g, " ");
  let index = 0;
  const group = (): string => {
    while (/\s/.test(text[index] || "") && index < text.length) index++;
    if (text[index] !== "{") throw Error("Use braces around fraction and root arguments.");
    index++;
    const value = read(true);
    return value;
  };
  const read = (nested = false): string => {
    let out = "";
    while (index < text.length) {
      const char = text[index++]!;
      if (char === "}") {
        if (!nested) throw Error("Unexpected closing brace.");
        return out;
      }
      if (char === "{") {
        out += `(${read(true)})`;
        continue;
      }
      if (char !== "\\") {
        out += char;
        continue;
      }
      const match = text.slice(index).match(/^[a-zA-Z]+/);
      if (!match) throw Error("Put each graph expression on a separate row.");
      const command = match[0];
      index += command.length;
      if (["frac", "dfrac", "tfrac"].includes(command)) {
        const numerator = group();
        const denominator = group();
        out += `((${numerator})/(${denominator}))`;
      } else if (command === "sqrt") out += `sqrt(${group()})`;
      else if (command === "pi") out += "pi";
      else if (["cdot", "times"].includes(command)) out += "*";
      else if (
        [
          "sin",
          "cos",
          "tan",
          "sinh",
          "cosh",
          "tanh",
          "exp",
          "log",
          "ln",
          "arcsin",
          "arccos",
          "arctan",
          "abs",
        ].includes(command)
      )
        out +=
          ({ ln: "log", arcsin: "asin", arccos: "acos", arctan: "atan" } as Record<string, string>)[
            command
          ] || command;
      else if (command === "operatorname") {
        const name = group();
        if (!/^(sin|cos|tan|exp|log|abs)$/.test(name)) throw Error(`Unsupported function: ${name}`);
        out += name;
      } else throw Error(`Unsupported LaTeX command: \\${command}`);
    }
    if (nested) throw Error("Missing closing brace.");
    return out;
  };
  return read().replace(/π/g, "pi").replace(/[·×]/g, "*").replace(/−/g, "-");
}
export function splitGraphExpressions(text: string): string[] {
  const lines = text
    .replace(/\\(?:begin|end)\{(?:aligned|align\*?|gathered)\}/g, "")
    .split(/\\\\(?:\s*\[[^\]]*\])?|\r?\n/)
    .map((line) => line.replace(/&/g, "").trim())
    .filter(Boolean);
  // A pasted formula followed by f(...) is naturally the definition of f.
  if (
    lines.length > 1 &&
    !lines[0]!.includes("=") &&
    lines.slice(1).some((line) => /\bf\s*\(/.test(line))
  )
    lines[0] = `f(x) = ${lines[0]}`;
  return lines;
}
