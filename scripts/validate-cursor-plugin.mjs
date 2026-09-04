import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(path) {
  return JSON.parse(readFileSync(join(packageRoot, path), "utf8"));
}

const packageJson = readJson("package.json");
const manifest = readJson(".cursor-plugin/plugin.json");
const mcpConfig = readJson("mcp.json");

const allowedManifestKeys = new Set([
  "name",
  "displayName",
  "description",
  "version",
  "author",
  "publisher",
  "homepage",
  "repository",
  "license",
  "logo",
  "keywords",
  "mcpServers",
]);

for (const key of Object.keys(manifest)) {
  assert.ok(allowedManifestKeys.has(key), `unsupported Cursor manifest field: ${key}`);
}

assert.match(manifest.name, /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/);
assert.equal(manifest.name, "nomue-mcp");
assert.equal(manifest.version, packageJson.version);
assert.match(manifest.version, /-rc\./, "the plugin must not hide release-candidate status");
assert.match(manifest.description, /Release-candidate/);
assert.match(manifest.description, /local stdio/);
assert.equal(manifest.displayName, "nomue Record Verifier");
assert.match(manifest.description, /verification of nomue Protocol Records/);
assert.match(manifest.description, /current release supports Welch Records/);
assert.deepEqual(manifest.author, { name: "Licklider" });
assert.equal(manifest.publisher, "Licklider");
assert.equal(manifest.homepage, "https://www.licklider.ai/docs/mcp-verification.md");
assert.equal(manifest.repository, "https://github.com/licklider-ai/nomue-mcp");
assert.equal(manifest.license, packageJson.license);
assert.equal(manifest.logo, "assets/licklider.svg");
assert.ok(existsSync(join(packageRoot, manifest.logo)), "Cursor plugin logo is missing");
assert.equal(manifest.mcpServers, "mcp.json");
assert.ok(existsSync(join(packageRoot, manifest.mcpServers)), "Cursor MCP config is missing");

assert.deepEqual(Object.keys(mcpConfig), ["mcpServers"]);
assert.deepEqual(Object.keys(mcpConfig.mcpServers), ["nomue-verify"]);
const server = mcpConfig.mcpServers["nomue-verify"];
assert.deepEqual(Object.keys(server).sort(), ["args", "command"]);
assert.equal(server.command, "npx");
assert.deepEqual(server.args, ["--yes", `${packageJson.name}@${packageJson.version}`]);
assert.equal(server.env, undefined);
assert.equal(server.url, undefined);

const readme = readFileSync(join(packageRoot, "README.md"), "utf8");
assert.ok(
  readme.includes(JSON.stringify(mcpConfig)),
  "README must contain the exact checked-in Cursor MCP configuration",
);

console.log("nomue-mcp Cursor plugin validation: OK");
