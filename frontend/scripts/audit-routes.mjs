import fs from "node:fs";
import assert from "node:assert/strict";
const registry = JSON.parse(
  fs.readFileSync(new URL("../src/route-registry.json", import.meta.url)),
);
const pages = fs
  .readdirSync(new URL("../src/pages", import.meta.url))
  .filter((f) => f.endsWith(".tsx"))
  .map((f) =>
    fs.readFileSync(new URL("../src/pages/" + f, import.meta.url), "utf8"),
  )
  .join("\n");
assert.equal(registry.length, 41);
assert.equal(new Set(registry.map((r) => r.path)).size, 41);
for (let n = 1; n <= 41; n++) {
  const r = registry.find((r) => r.number === n);
  assert(r, `Missing screen ${n}`);
  assert(r.id.startsWith(String(n).padStart(2, "0") + "_"));
  assert(
    new RegExp("export function " + r.component + "\\b").test(pages),
    `Missing ${r.component}`,
  );
  assert(r.path.startsWith("/"));
  assert(["public", "user", "staff"].includes(r.access));
}
console.log(
  "PASS: all 41 screen IDs, paths, components, and access requirements are registered.",
);
