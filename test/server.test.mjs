import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

import {
  RELEASE_1_BUNDLE,
  SERVER_VERSION,
  TOOL_DESCRIPTION,
  TOOL_NAME,
  VERIFIER_VERSION,
  runVerifier,
} from "../src/server.js";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(here, "..");
const serverBin = join(here, "../bin/nomue-mcp.js");

async function fixture(name) {
  return readFile(join(repositoryRoot, "fixtures", name), "utf8");
}

function withoutGeneratedAt(value) {
  const copy = structuredClone(value);
  delete copy.generated_at;
  return copy;
}

test("the adapter invokes the exact published verifier package", async () => {
  assert.equal(VERIFIER_VERSION, "0.2.1-rc.0");
  const result = await runVerifier(await fixture("valid.json"));
  assert.equal(result.exitCode, 0);
  assert.equal(result.output.interpretation_bundle_id, RELEASE_1_BUNDLE);
  assert.equal(result.output.guarantee_boundary.scientific_validity, "not_asserted");
  assert.equal(Object.hasOwn(result.output, "VERIFIED"), false);
  assert.equal(
    result.stdoutSha256,
    `sha256:${createHash("sha256").update(result.stdout).digest("hex")}`,
  );
  assert.equal(
    result.recordJsonSha256,
    `sha256:${createHash("sha256").update(await fixture("valid.json")).digest("hex")}`,
  );
});

test("a scoped verifier failure remains a normal verifier artifact", async () => {
  const result = await runVerifier(await fixture("invalid-result-mismatch.json"));
  assert.equal(result.exitCode, 2);
  assert.match(result.stdout, /NRS-DECLARED-RESULT-MISMATCH/);
  assert.equal(result.output.guarantee_boundary.scientific_validity, "not_asserted");
});

test("parse, routing, and resource refusals preserve verifier exit codes", async () => {
  const emptyRefusal = await runVerifier("");
  assert.equal(emptyRefusal.exitCode, 2);
  assert.equal(emptyRefusal.output.output_type, "nomue-verifier-refusal");
  assert.equal(emptyRefusal.output.refusal_kind, "parse_error");

  const parseRefusal = await runVerifier("{");
  assert.equal(parseRefusal.exitCode, 2);
  assert.equal(parseRefusal.output.output_type, "nomue-verifier-refusal");
  assert.equal(parseRefusal.output.refusal_kind, "parse_error");

  const duplicateMemberRefusal = await runVerifier('{"a":1,"a":2}');
  assert.equal(duplicateMemberRefusal.exitCode, 2);
  assert.equal(duplicateMemberRefusal.output.refusal_kind, "parse_error");
  assert.deepEqual(duplicateMemberRefusal.output.reason_codes, [
    "NRS-DUPLICATE-JSON-MEMBER",
  ]);

  const unsupportedRecord = JSON.parse(await fixture("valid.json"));
  unsupportedRecord.interpretation_bundle_id = "urn:nomue:bundle:unsupported-test:1";
  const routingRefusal = await runVerifier(JSON.stringify(unsupportedRecord));
  assert.equal(routingRefusal.exitCode, 3);
  assert.equal(routingRefusal.output.refusal_kind, "unsupported_bundle");

  const resourceRefusal = await runVerifier(" ".repeat(5 * 1024 * 1024 + 1));
  assert.equal(resourceRefusal.exitCode, 4);
  assert.equal(resourceRefusal.output.refusal_kind, "resource_limit");
});

test("the MCP tool is discoverable, narrow, and byte-preserving", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverBin],
    stderr: "pipe",
  });
  const client = new Client({ name: "nomue-mcp-test", version: "1.0.0" });
  const startedAt = performance.now();

  try {
    await client.connect(transport);
    const listed = await client.listTools();
    const startupMs = performance.now() - startedAt;
    assert.ok(startupMs < 10_000, `server startup took ${startupMs}ms`);
    assert.equal(listed.tools.length, 1);
    assert.equal(listed.tools[0].name, TOOL_NAME);
    assert.equal(listed.tools[0].description, TOOL_DESCRIPTION);
    assert.equal(listed.tools[0].inputSchema.type, "object");
    assert.deepEqual(listed.tools[0].inputSchema.required, ["record_json"]);
    assert.equal(listed.tools[0].inputSchema.additionalProperties, false);
    assert.equal(listed.tools[0].inputSchema.properties.record_json.type, "string");
    assert.equal(
      Object.hasOwn(listed.tools[0].inputSchema.properties.record_json, "minLength"),
      false,
    );
    assert.match(listed.tools[0].description, /Use when/);
    assert.match(listed.tools[0].description, /Do not use/);
    assert.match(listed.tools[0].description, /After a failure or refusal/);

    const recordJson = await fixture("valid.json");
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: { record_json: recordJson },
    });
    assert.notEqual(result.isError, true);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, "text");
    assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text));
    assert.equal(
      result._meta["ai.licklider.nomue/verifier-stdout-sha256"],
      `sha256:${createHash("sha256").update(result.content[0].text).digest("hex")}`,
    );
    assert.equal(result._meta["ai.licklider.nomue/verifier-exit-code"], 0);
    assert.equal(
      result._meta["ai.licklider.nomue/record-json-sha256"],
      `sha256:${createHash("sha256").update(recordJson).digest("hex")}`,
    );
    assert.equal(
      result._meta["ai.licklider.nomue/verifier-package"],
      `@licklider/nomue-verifier@${VERIFIER_VERSION}`,
    );
    assert.deepEqual(result._meta["ai.licklider.nomue/replay-volatile-fields"], [
      "generated_at",
    ]);

    const emptyResult = await client.callTool({
      name: TOOL_NAME,
      arguments: { record_json: "" },
    });
    assert.notEqual(emptyResult.isError, true);
    assert.equal(emptyResult._meta["ai.licklider.nomue/verifier-exit-code"], 2);
    assert.equal(emptyResult.structuredContent.output_type, "nomue-verifier-refusal");
    assert.equal(emptyResult.structuredContent.refusal_kind, "parse_error");

    const independent = await runVerifier(recordJson);
    assert.deepEqual(
      withoutGeneratedAt(result.structuredContent),
      withoutGeneratedAt(independent.output),
      "independent verifier replay differs outside generated_at",
    );
  } finally {
    await client.close();
  }
});

test("MCP does not turn a verifier mismatch into a transport error", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverBin],
    stderr: "pipe",
  });
  const client = new Client({ name: "nomue-mcp-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: { record_json: await fixture("invalid-result-mismatch.json") },
    });
    assert.notEqual(result.isError, true);
    assert.equal(result._meta["ai.licklider.nomue/verifier-exit-code"], 2);
    assert.match(result.content[0].text, /NRS-DECLARED-RESULT-MISMATCH/);
  } finally {
    await client.close();
  }
});

test("package and server versions stay aligned", () => {
  assert.equal(SERVER_VERSION, "0.1.0-rc.0");
});
