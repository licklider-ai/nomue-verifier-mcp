# nomue MCP — local Welch Record verification

Local, issuer-independent nomue Record verification for MCP clients.

## Status

`@licklider/nomue-mcp` is an experimental release-candidate package for Phase 1 local
use. It supports **stdio only**. It does not expose an HTTP endpoint, require an account,
use an API key, or call a Licklider-hosted service.

The server is a thin adapter around the exact npm dependency:

```text
@licklider/nomue-verifier@0.2.1-rc.0
```

It does not implement statistical or Protocol semantics independently.
The published CLI tarball includes `npm-shrinkwrap.json` in addition to exact direct
dependency pins, so npm versions that honor dependency-package shrinkwraps can install
the reviewed runtime tree.

## Add it to an MCP client

Add this one-line entry inside the client's `mcpServers` object:

```json
"nomue":{"command":"npx","args":["--yes","@licklider/nomue-mcp@0.1.0-rc.0"]}
```

A complete configuration file is:

```json
{"mcpServers":{"nomue":{"command":"npx","args":["--yes","@licklider/nomue-mcp@0.1.0-rc.0"]}}}
```

This is the standard shape for macOS, Linux, and MCP clients that resolve `npx`
directly. No environment variables are needed. The first `npx` launch may download npm
dependencies; after installation, verification itself runs locally and does not require
network access.

On Windows, a client that does not resolve npm command shims directly can use this
equivalent entry:

```json
"nomue":{"command":"cmd.exe","args":["/d","/s","/c","npx --yes @licklider/nomue-mcp@0.1.0-rc.0"]}
```

The repository CI matrix verifies the installed npm command shim and exercises the
installed package entry point on Windows, macOS, and Linux. A clean-profile launch in
Claude Desktop, Cursor, and Cline remains a release gate after the repository and npm
release candidate are public.

[Add nomue to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=nomue&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyItLXllcyIsIkBsaWNrbGlkZXIvbm9tdWUtbWNwQDAuMS4wLXJjLjAiXX0%3D)

## Tool

### `verify_nomue_welch_record`

**Use when:** you already have a complete nomue Record declaring the exact public
Release 1 bundle
`urn:nomue:bundle:itgc-guarantee:0.2.1-draft.1` and need scoped structural, digest,
admissibility, computability, or two-sided Welch recomputation checks.

**Do not use when:** you have only raw samples and need a new Welch calculation; need
method selection; need an overall scientific-validity or causal judgment; need paired-t,
Wilcoxon, Mann-Whitney, or another method; or have an unsupported Protocol bundle.

Input:

```json
{
  "record_json": "{...complete nomue Record JSON text...}"
}
```

`record_json` is JSON **text**, not a parsed object. Empty and malformed strings are
accepted by the adapter and passed to the verifier. Preserving the original text keeps
strict JSON parsing, duplicate-member rejection, digest verification, and resource-limit
behavior inside the verifier. An MCP string cannot represent a malformed UTF-8 byte
sequence; test that byte-level refusal directly with the npm verifier CLI.

## Result contract

The first MCP text content block is the exact stdout emitted by the pinned verifier CLI
implementation, including its final newline. `structuredContent` contains the same
parsed verifier artifact without a new adapter verdict. MCP result metadata carries:

- the verifier exit code;
- a SHA-256 digest of the exact input JSON text encoded as UTF-8;
- a SHA-256 digest of the exact stdout bytes; and
- the exact verifier npm package identity; and
- the verifier-generated field (`generated_at`) that changes on independent replay.

These metadata fields describe the invocation and replay evidence; they are not a new
verdict or guarantee.

Verifier exit codes retain their existing meanings:

| Code | Meaning |
| --- | --- |
| `0` | A report exists and every applicable scoped check outcome is `pass`. |
| `2` | A scoped check failed, or a parse/canonicalization refusal occurred. |
| `3` | Routing failure or unsupported bundle; no report exists. |
| `4` | Resource-limit safe refusal. |
| `5` | Internal verifier refusal. |

Codes `2` through `5` remain normal, machine-readable verifier artifacts. The MCP call
is marked as a tool error only when the adapter itself cannot produce a verifier report
or refusal.

There is no blanket `VERIFIED` field. Read each scoped check, its version and reason
codes, plus `guarantee_boundary`. A clean report does not establish scientific truth or
scientific validity.

### Exactness and replay

The MCP response preserves the bytes from the **same underlying verifier invocation**;
the input and output SHA-256 metadata make that preservation testable. A separate replay
with `@licklider/nomue-verifier@0.2.1-rc.0` reproduces the substantive artifact exactly, but
the verifier intentionally creates a fresh top-level `generated_at` timestamp on each
run. Therefore two separate invocations cannot honestly be described as byte-identical.
Tests require equality of every other field and byte-for-byte preservation within the
MCP invocation.

To replay independently, save the same `record_json` text and run:

```bash
npx --yes @licklider/nomue-verifier@0.2.1-rc.0 verify ./record.json --format json-compact
```

## Supported environment

| Transport | Operating systems | Node.js | Authentication | Runtime network |
| --- | --- | --- | --- | --- |
| stdio | Linux, macOS, Windows | 20 or 22 | None | Not required |

The package declares `node >=20`; the release CI matrix is configured to exercise Node.js
20 and 22 on all three operating systems. Do not claim an operating-system/client pair
as release-tested until that public CI job and the corresponding clean-profile client
check have passed.

## Registry metadata

`server.json` and the package `mcpName` are aligned for the official MCP Registry:

```text
io.github.licklider-ai/nomue-mcp
```

The registry artifact advertises only the npm package and stdio transport. Hosted HTTP,
SLA, authentication, logging, and rate limiting are intentionally outside Phase 1.
Prepared publication and directory-submission steps are in
[`registry/SUBMISSIONS.md`](registry/SUBMISSIONS.md).

## Development

From this directory:

```bash
npm ci
npm test
npm run test:package
```

The package smoke test packs and installs the tarball at a path containing spaces,
starts its generated npm executable shim, lists the tool, calls valid, mismatched, and
empty Records, checks output preservation, and enforces the 10-second startup budget.

## Security, non-claims, and license

See [SECURITY.md](SECURITY.md), [NON-CLAIMS.md](NON-CLAIMS.md), and
[LICENSE](LICENSE).
