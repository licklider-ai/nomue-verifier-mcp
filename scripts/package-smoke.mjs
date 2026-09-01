import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
const temporaryRoot = mkdtempSync(join(tmpdir(), "nomue-mcp-package-smoke-"));
const packDirectory = join(temporaryRoot, "pack");
const installDirectory = join(temporaryRoot, "installed package with spaces");
const inputDirectory = join(temporaryRoot, "input records");
const expectedPackageName = "@licklider/nomue-mcp";
const expectedPackageVersion = "0.1.0-rc.0";
const expectedMcpName = "io.github.licklider-ai/nomue-mcp";
const expectedVerifierVersion = "0.2.1-rc.0";
const expectedRuntimeDependencies = {
  "@licklider/nomue-verifier": expectedVerifierVersion,
  "@modelcontextprotocol/server": "2.0.0",
  zod: "4.5.4",
};
const childEnvironment = { ...process.env };
delete childEnvironment.npm_config_dry_run;
delete childEnvironment.NPM_CONFIG_DRY_RUN;

const verifierEnvironment = Object.fromEntries(
  [
    "PATH",
    "Path",
    "SystemRoot",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "TEMP",
    "TMP",
    "TMPDIR",
    "LANG",
    "LC_ALL",
  ].flatMap((name) =>
    process.env[name] === undefined ? [] : [[name, process.env[name]]],
  ),
);

mkdirSync(packDirectory, { recursive: true });
mkdirSync(installDirectory, { recursive: true });
mkdirSync(inputDirectory, { recursive: true });

function fail(message, result) {
  if (result?.error) console.error(result.error);
  if (result?.stdout) console.error(result.stdout);
  if (result?.stderr) console.error(result.stderr);
  throw new Error(message);
}

function runNpm(args, options = {}) {
  if (!npmCli) fail("npm_execpath is unavailable; run this check through npm");
  return spawnSync(process.execPath, [npmCli, ...args], {
    cwd: packageRoot,
    encoding: "utf8",
    env: childEnvironment,
    ...options,
  });
}

function parseJson(label, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label}: expected JSON (${error.message})`, { stdout: text });
  }
}

function withoutGeneratedAt(value) {
  const copy = structuredClone(value);
  delete copy.generated_at;
  return copy;
}

async function main() {
  try {
    const packResult = runNpm(["pack", "--json", "--pack-destination", packDirectory]);
    if (packResult.status !== 0) fail("npm pack failed", packResult);
    const packOutput = parseJson("npm pack", packResult.stdout);
    const filename = packOutput?.[0]?.filename;
    if (typeof filename !== "string" || filename.length === 0) {
      fail("npm pack did not return a tarball filename", packResult);
    }
    const tarball = join(packDirectory, filename);
    assert.ok(existsSync(tarball), `packed tarball is missing: ${tarball}`);
    const packedPaths = new Set(packOutput[0].files.map((file) => file.path));
    for (const required of [
      "bin/nomue-mcp.js",
      "src/server.js",
      "assets/licklider-400.png",
      "README.md",
      "npm-shrinkwrap.json",
      "server.json",
      "registry/SUBMISSIONS.md",
      "DEPENDENCY-PIN.json",
      "NON-CLAIMS.md",
      "SECURITY.md",
      "CONTRIBUTING.md",
      "LICENSE",
      "package.json",
    ]) {
      assert.ok(packedPaths.has(required), `packed tarball omits ${required}`);
    }
    const packedBin = packOutput[0].files.find((file) => file.path === "bin/nomue-mcp.js");
    if (process.platform !== "win32") {
      assert.equal(packedBin?.mode, 0o755, "packed nomue-mcp launcher must be executable");
    }

    const installResult = runNpm(
      [
        "install",
        "--no-audit",
        "--no-fund",
        "--prefix",
        installDirectory,
        tarball,
      ],
      { cwd: installDirectory },
    );
    if (installResult.status !== 0) fail("tarball installation failed", installResult);

    const installedRoot = join(
      installDirectory,
      "node_modules",
      "@licklider",
      "nomue-mcp",
    );
    const installedPackage = parseJson(
      "installed package.json",
      readFileSync(join(installedRoot, "package.json"), "utf8"),
    );
    assert.equal(installedPackage.name, expectedPackageName);
    assert.equal(installedPackage.version, expectedPackageVersion);
    assert.equal(installedPackage.mcpName, expectedMcpName);
    for (const [name, version] of Object.entries(expectedRuntimeDependencies)) {
      assert.equal(installedPackage.dependencies?.[name], version, `${name} is not exact-pinned`);
    }
    assert.ok(
      existsSync(join(installedRoot, "npm-shrinkwrap.json")),
      "published CLI dependency lock is missing",
    );

    const registry = parseJson(
      "installed server.json",
      readFileSync(join(installedRoot, "server.json"), "utf8"),
    );
    assert.equal(registry.name, installedPackage.mcpName);
    assert.equal(registry.version, installedPackage.version);
    assert.equal(registry.packages?.[0]?.identifier, installedPackage.name);
    assert.equal(registry.packages?.[0]?.version, installedPackage.version);
    assert.equal(registry.packages?.[0]?.transport?.type, "stdio");
    assert.equal(registry.remotes, undefined);

    const shimName = process.platform === "win32" ? "nomue-mcp.cmd" : "nomue-mcp";
    const shimPath = join(installDirectory, "node_modules", ".bin", shimName);
    assert.ok(
      existsSync(shimPath),
      "nomue-mcp executable shim is missing",
    );

    const validRecord = readFileSync(join(packageRoot, "fixtures", "valid.json"), "utf8");
    const mismatchRecord = readFileSync(
      join(packageRoot, "fixtures", "invalid-result-mismatch.json"),
      "utf8",
    );
    const validPath = join(inputDirectory, "valid record.json");
    writeFileSync(validPath, validRecord, { encoding: "utf8", mode: 0o600 });

    const publicCommand =
      process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : shimPath;
    const publicArgs =
      process.platform === "win32" ? ["/d", "/s", "/c", `"${shimPath}"`] : [];
    const transport = new StdioClientTransport({
      command: publicCommand,
      args: publicArgs,
      stderr: "pipe",
    });
    const client = new Client({ name: "nomue-mcp-package-smoke", version: "1.0.0" });
    const startedAt = performance.now();
    try {
      await client.connect(transport);
      const listed = await client.listTools();
      const startupMs = performance.now() - startedAt;
      assert.ok(startupMs < 10_000, `packed server startup took ${startupMs}ms`);
      assert.deepEqual(listed.tools.map((tool) => tool.name), ["verify_nomue_welch_record"]);
      assert.match(listed.tools[0].description, /Use when/);
      assert.match(listed.tools[0].description, /Do not use/);
      assert.match(listed.tools[0].description, /After a failure or refusal/);

      const validResult = await client.callTool({
        name: "verify_nomue_welch_record",
        arguments: { record_json: validRecord },
      });
      assert.notEqual(validResult.isError, true);
      assert.equal(validResult._meta["ai.licklider.nomue/verifier-exit-code"], 0);
      assert.equal(
        validResult._meta["ai.licklider.nomue/record-json-sha256"],
        `sha256:${createHash("sha256").update(validRecord).digest("hex")}`,
      );
      assert.equal(
        validResult._meta["ai.licklider.nomue/verifier-stdout-sha256"],
        `sha256:${createHash("sha256").update(validResult.content[0].text).digest("hex")}`,
      );
      assert.deepEqual(validResult.structuredContent, JSON.parse(validResult.content[0].text));
      assert.deepEqual(validResult._meta["ai.licklider.nomue/replay-volatile-fields"], [
        "generated_at",
      ]);

      const directVerifierCli = join(
        installDirectory,
        "node_modules",
        "@licklider",
        "nomue-verifier",
        "bin",
        "nomue.cjs",
      );
      const direct = spawnSync(
        process.execPath,
        [directVerifierCli, "verify", validPath, "--format", "json-compact"],
        { encoding: "utf8", cwd: installDirectory, env: verifierEnvironment },
      );
      assert.equal(direct.status, 0);
      assert.equal(direct.stderr, "");
      assert.deepEqual(
        withoutGeneratedAt(validResult.structuredContent),
        withoutGeneratedAt(parseJson("direct verifier", direct.stdout)),
        "packed MCP and independent verifier replay differ outside generated_at",
      );

      const mismatchResult = await client.callTool({
        name: "verify_nomue_welch_record",
        arguments: { record_json: mismatchRecord },
      });
      assert.notEqual(mismatchResult.isError, true);
      assert.equal(mismatchResult._meta["ai.licklider.nomue/verifier-exit-code"], 2);
      assert.match(mismatchResult.content[0].text, /NRS-DECLARED-RESULT-MISMATCH/);

      const emptyResult = await client.callTool({
        name: "verify_nomue_welch_record",
        arguments: { record_json: "" },
      });
      assert.notEqual(emptyResult.isError, true);
      assert.equal(emptyResult._meta["ai.licklider.nomue/verifier-exit-code"], 2);
      assert.equal(emptyResult.structuredContent.output_type, "nomue-verifier-refusal");
      assert.equal(emptyResult.structuredContent.refusal_kind, "parse_error");
    } finally {
      await client.close();
    }

    const serverSource = readFileSync(join(installedRoot, "src", "server.js"), "utf8");
    for (const forbidden of ["node:http", "node:https", "node:net", "node:tls", "fetch("]) {
      assert.equal(serverSource.includes(forbidden), false, `runtime network surface: ${forbidden}`);
    }

    console.log("nomue-mcp package-smoke: OK");
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

await main();
