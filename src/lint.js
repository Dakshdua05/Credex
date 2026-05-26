import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensions = new Set([".js", ".html", ".css", ".md", ".yml", ".json"]);
const ignore = new Set(["node_modules", ".git", "data"]);
const errors = [];

await walk(root);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignore.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (extensions.has(path.extname(entry.name))) {
      await checkFile(fullPath);
    }
  }
}

async function checkFile(filePath) {
  const text = await readFile(filePath, "utf8");
  if (/\t/.test(text)) errors.push(`${relative(filePath)} contains tabs`);
  if (/[ \t]$/m.test(text)) errors.push(`${relative(filePath)} contains trailing whitespace`);
  if (!text.endsWith("\n")) errors.push(`${relative(filePath)} must end with a newline`);
}

function relative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}
