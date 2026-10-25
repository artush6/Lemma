import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";

// Include framework-discovered routes/entrypoints and test-only code as roots.
// preProcessFile follows static imports, re-exports, type imports and literal dynamic imports.
// Honor .gitignore so local, throwaway browser fixtures do not count as application code.
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "--", "src"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter((file) => /\.[jt]sx?$/.test(file) && fs.existsSync(file));
const known = new Set(files);
const roots = files.filter(
  (file) =>
    file.startsWith("src/routes/") ||
    /^src\/(router|start|server|routeTree\.gen)\.[jt]sx?$/.test(file) ||
    /\.(test|spec)\.[jt]sx?$/.test(file) ||
    file === "src/test/setup.ts",
);
const resolve = (from, specifier) => {
  const base = specifier.startsWith("@/")
    ? `src/${specifier.slice(2)}`
    : specifier.startsWith(".")
      ? path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier))
      : null;
  if (!base) return null;
  return [
    base,
    ...[".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"].map((suffix) => base + suffix),
  ].find((file) => known.has(file));
};
const imports = new Map(
  files.map((file) => [
    file,
    ts
      .preProcessFile(fs.readFileSync(file, "utf8"), true, true)
      .importedFiles.map(({ fileName }) => resolve(file, fileName))
      .filter(Boolean),
  ]),
);
const reachable = new Set();
const visit = (file) => {
  if (reachable.has(file)) return;
  reachable.add(file);
  imports.get(file).forEach(visit);
};
roots.forEach(visit);
const unused = files.filter((file) => !reachable.has(file));
if (unused.length) {
  console.error(
    `Found ${unused.length} source modules unreachable from framework entrypoints or tests:\n${unused.map((file) => `  ${file}`).join("\n")}`,
  );
  console.error("Check runtime/configuration references before deleting a reported module.");
  process.exitCode = 1;
} else {
  console.log(
    `All ${files.length} source modules are reachable from ${roots.length} entrypoints/tests.`,
  );
}
