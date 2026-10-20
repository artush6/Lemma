export type LatexToken = { text: string; className?: string };
/** Matching delimiters share their nesting color; escaped delimiters remain commands. */
export function latexTokens(source: string): LatexToken[] {
  const stack: { opening: string; token: LatexToken; depth: number }[] = [];
  const pairs: Record<string, string> = { "}": "{", ")": "(", "]": "[" };
  const tokens = (
    source.match(/\\(?:[a-zA-Z]+|.)|[{}()[\]]|\d+(?:\.\d+)?|[_^]|[^\\{}()[\]\d_^]+/g) || []
  ).map((text) => {
    const token: LatexToken = { text };
    if (/^[{([]$/.test(text)) {
      const depth = stack.length;
      token.className = `latex-bracket-${depth % 5}`;
      stack.push({ opening: text, token, depth });
    } else if (pairs[text]) {
      const last = stack[stack.length - 1];
      if (last?.opening === pairs[text]) {
        token.className = `latex-bracket-${last.depth % 5}`;
        stack.pop();
      } else token.className = "latex-unmatched";
    } else if (text.startsWith("\\")) token.className = "latex-command";
    else if (/^\d/.test(text)) token.className = "latex-number";
    else if (/^[_^]$/.test(text)) token.className = "latex-operator";
    return token;
  });
  for (const item of stack) item.token.className = "latex-unmatched";
  return tokens;
}
