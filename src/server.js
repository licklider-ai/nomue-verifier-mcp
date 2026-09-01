import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const require = createRequire(import.meta.url);
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const packageManifest = require(join(packageRoot, "package.json"));
const verifierManifestPath = require.resolve("@licklider/nomue-verifier/package.json");
const verifierRoot = dirname(verifierManifestPath);
const verifierManifest = require(verifierManifestPath);
const verifierCliSource = join(verifierRoot, "reference", "verifier", "src", "cli.ts");

export const SERVER_NAME = "io.github.licklider-ai/nomue-mcp";
export const SERVER_VERSION = packageManifest.version;
export const VERIFIER_PACKAGE = "@licklider/nomue-verifier";
export const VERIFIER_VERSION = verifierManifest.version;
export const TOOL_NAME = "verify_nomue_welch_record";
export const RELEASE_1_BUNDLE = "urn:nomue:bundle:itgc-guarantee:0.2.1-draft.1";

export const TOOL_DESCRIPTION = [
  "Experimental release-candidate tool for issuer-independent local verification of a complete nomue Protocol Release 1 Record.",
  `Use when a Record declares ${RELEASE_1_BUNDLE}, represents independent two-group continuous outcomes using the two-sided Welch two-sample t procedure, and needs scoped structural, digest, admissibility, computability, or recomputation checks.`,
  "Do not use to calculate a Welch test from raw samples, select a method, judge scientific truth or causality, verify paired-t, Wilcoxon, Mann-Whitney, or interpret an unsupported bundle.",
  "The returned artifact is the unmodified verifier report or refusal; it contains no blanket VERIFIED result. Inspect each scoped check, version, reason code, and guarantee boundary.",
  "After a failure or refusal, use the exact reason codes to request a corrected or supported Record; do not silently select another statistical method.",
].join(" ");

const MAX_STDOUT_BYTES = 8 * 1024 * 1024;
const MAX_STDERR_BYTES = 64 * 1024;
const INVOCATION_TIMEOUT_MS = 10_000;
const ACCEPTED_EXIT_CODES = new Set([0, 2, 3, 4, 5]);

class VerifierInvocationError extends Error {
  constructor(code) {
    super(code);
    this.name = "VerifierInvocationError";
    this.code = code;
  }
}

function childEnvironment() {
  const allowed = [
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
  ];
  return Object.fromEntries(
    allowed.flatMap((name) =>
      process.env[name] === undefined ? [] : [[name, process.env[name]]],
    ),
  );
}

function invokeVerifier(recordPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--import",
        "tsx",
        verifierCliSource,
        "verify",
        recordPath,
        "--format",
        "json-compact",
      ],
      {
        cwd: verifierRoot,
        env: childEnvironment(),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );

    const stdout = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let failureCode = null;
    let settled = false;

    const rejectOnce = (code) => {
      if (settled) return;
      settled = true;
      reject(new VerifierInvocationError(code));
    };

    const terminate = (code) => {
      if (failureCode !== null) return;
      failureCode = code;
      child.kill("SIGKILL");
    };

    const timeout = setTimeout(
      () => terminate("verifier_timeout"),
      INVOCATION_TIMEOUT_MS,
    );
    timeout.unref();

    child.once("error", () => {
      clearTimeout(timeout);
      rejectOnce(failureCode ?? "verifier_process_start_failed");
    });
    child.stdout.on("data", (chunk) => {
      if (failureCode !== null) return;
      stdoutBytes += chunk.length;
      if (stdoutBytes > MAX_STDOUT_BYTES) {
        terminate("verifier_output_limit_exceeded");
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      if (failureCode !== null) return;
      stderrBytes += chunk.length;
      if (stderrBytes > MAX_STDERR_BYTES) {
        terminate("verifier_stderr_limit_exceeded");
        return;
      }
    });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (settled) return;
      if (failureCode !== null) {
        rejectOnce(failureCode);
        return;
      }
      if (signal !== null) {
        rejectOnce("verifier_process_terminated");
        return;
      }
      if (code === null || !ACCEPTED_EXIT_CODES.has(code)) {
        rejectOnce("verifier_exit_code_invalid");
        return;
      }
      if (stderrBytes !== 0) {
        rejectOnce("verifier_emitted_unexpected_stderr");
        return;
      }
      resolve({ exitCode: code, stdoutBytes: Buffer.concat(stdout) });
    });
  });
}

export async function runVerifier(recordJson) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "nomue-mcp-"));
  const recordPath = join(temporaryRoot, "record.json");
  const recordBytes = Buffer.from(recordJson, "utf8");

  try {
    await writeFile(recordPath, recordBytes, { flag: "wx", mode: 0o600 });
    const rawInvocation = await invokeVerifier(recordPath);
    let stdout;
    try {
      stdout = new TextDecoder("utf-8", { fatal: true }).decode(rawInvocation.stdoutBytes);
    } catch {
      throw new VerifierInvocationError("verifier_output_not_utf8");
    }
    let output;
    try {
      output = JSON.parse(stdout);
    } catch {
      throw new VerifierInvocationError("verifier_output_not_json");
    }
    if (typeof output !== "object" || output === null || Array.isArray(output)) {
      throw new VerifierInvocationError("verifier_output_not_object");
    }
    return {
      exitCode: rawInvocation.exitCode,
      output,
      recordJsonSha256: `sha256:${createHash("sha256").update(recordBytes).digest("hex")}`,
      stdout,
      stdoutSha256: `sha256:${createHash("sha256").update(rawInvocation.stdoutBytes).digest("hex")}`,
    };
  } finally {
    await rm(temporaryRoot, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  }
}

function adapterErrorResult(error) {
  const code =
    error instanceof VerifierInvocationError ? error.code : "unexpected_adapter_failure";
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `nomue-mcp adapter error (${code}); no verifier report or refusal was produced`,
      },
    ],
    _meta: {
      "ai.licklider.nomue/adapter-error-code": code,
    },
  };
}

export function createServer() {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Use the verifier only for a complete nomue Record. Preserve the returned scoped outcomes and non-asserted boundaries. On failure or refusal, surface the exact reason codes and request a corrected or supported Record; do not silently choose another statistical method.",
    },
  );

  server.registerTool(
    TOOL_NAME,
    {
      title: "Verify nomue Welch Record",
      description: TOOL_DESCRIPTION,
      inputSchema: z
        .object({
          record_json: z
            .string()
            .describe(
              "The complete nomue Record as JSON text. Pass the original text, including an empty or malformed candidate, so strict parsing, duplicate-member rejection, digest verification, and resource limits remain owned by the verifier.",
            ),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ record_json: recordJson }) => {
      try {
        const result = await runVerifier(recordJson);
        return {
          content: [{ type: "text", text: result.stdout }],
          structuredContent: result.output,
          _meta: {
            "ai.licklider.nomue/verifier-exit-code": result.exitCode,
            "ai.licklider.nomue/record-json-sha256": result.recordJsonSha256,
            "ai.licklider.nomue/verifier-stdout-sha256": result.stdoutSha256,
            "ai.licklider.nomue/verifier-package": `${VERIFIER_PACKAGE}@${VERIFIER_VERSION}`,
            "ai.licklider.nomue/replay-volatile-fields": ["generated_at"],
          },
        };
      } catch (error) {
        return adapterErrorResult(error);
      }
    },
  );

  return server;
}

export async function startServer() {
  const server = createServer();
  const transport = new StdioServerTransport(process.stdin, process.stdout, {
    maxBufferSize: 16 * 1024 * 1024,
  });
  await server.connect(transport);
}
