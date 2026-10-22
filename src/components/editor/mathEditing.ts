export type FieldRange = [number, number];
/** Keep snippet placeholders attached to their arguments as the source changes. */
export function mapFieldRanges(before: string, after: string, fields: FieldRange[]): FieldRange[] {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let oldEnd = before.length,
    newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const delta = newEnd - oldEnd;
  return fields.map(([from, to]) => {
    if (to < start) return [from, to];
    if (from > oldEnd || (from === oldEnd && from !== start)) return [from + delta, to + delta];
    return [
      Math.min(from, start),
      Math.max(Math.min(from, start), to >= oldEnd ? to + delta : newEnd),
    ];
  });
}
/** Innermost non-empty brace arguments also work when source was typed by hand. */
export function latexArgumentRanges(source: string): FieldRange[] {
  const ranges: FieldRange[] = [];
  const stack: { start: number; nested: boolean }[] = [];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\\") {
      i++;
      continue;
    }
    if (source[i] === "{") {
      if (stack.length) stack[stack.length - 1]!.nested = true;
      stack.push({ start: i + 1, nested: false });
    }
    if (source[i] === "}") {
      const item = stack.pop();
      if (item && !item.nested && i > item.start) ranges.push([item.start, i]);
    }
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}
