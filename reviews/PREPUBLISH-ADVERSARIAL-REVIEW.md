# Prepublication adversarial review

Date: 2026-09-01

## Decision

**Conditional GO for creating the public repository and publishing the npm release
candidate.** No unresolved adapter-code blocker remains in the reviewed Linux, Node.js
20/22/24, packed-install, or local npm-exec paths.

This is not a claim that publication is complete. Public CI on Windows and
macOS, clean Claude Desktop/Cursor/Cline launches, npm publication, registry
submissions, and the post-publication website/docs update remain external
release gates.

Review input:
`cc4e308cf5fe8b2fdac9a9b5e7586716d26da401`

Repair candidate:
`8a9f7be631c741a05a89f2dd9335d9ebea8fafe7`

## Scope and conflict check

- The adapter remains a one-tool stdio transport wrapper. It adds no statistical,
  schema, verification, decision-vocabulary, UI, workspace, billing, authentication,
  hosted-service, or orchestration semantics.
- The installed and live npm dependency remains
  `@licklider/nomue-verifier@0.2.1-rc.0`. Its npm integrity and git head match
  `DEPENDENCY-PIN.json`; the installed `SOURCE-PIN.json` matches the current verifier
  repository copy.
- The verifier checkout was clean at `0c2f019`, and its published package
  identity had not changed during this review.
- `@licklider/nomue-mcp@0.1.0-rc.0` was still absent from npm, and the intended public
  GitHub repository was not yet available. The official site correctly
  continued to say that no public MCP endpoint was open; changing that claim
  before live publication would be premature.
- Recorded nomue-app state has the app main line at `LINT-094` then `LINT-096`, with
  `LINT-095` moved to nomue-evaluation. Evaluation is separated from app
  mutation and release control. No collision with this standalone adapter was
  identified. A current private nomue-app working tree was not available in
  this workspace, so any unpublished change to that recorded state remains a
  human pre-publication check.

Applicable nomue-app LINT boundaries:

- `LINT-072`: the public verifier consumes the frozen/versioned Layer 1 binding rather
  than defining another product-normative authority. This adapter keeps the exact
  verifier package and Release 1 bundle pin.
- `LINT-075`: verification semantics and `NRS-VERIFY-*` vocabulary remain Layer 1-owned.
  The MCP response preserves the verifier report/refusal and adds invocation metadata,
  not another verdict.

## Findings and repairs

<!-- markdownlint-disable MD013 -->

| ID | Severity | Adversarial finding | Disposition |
| --- | --- | --- | --- |
| AR-01 | BLOCKER | `record_json: ""` was rejected by Zod before the verifier, while an empty verifier input has a governed exit-2 parse refusal. | Removed `min(1)` and added direct and MCP empty-input regressions. |
| AR-02 | BLOCKER | The adapter launched the verifier's synchronous wrapper; killing only that wrapper on timeout could leave its verifier child alive while temporary cleanup began. | Launch the exact pinned package's CLI implementation directly, kill the real verifier process, and wait for `close` before rejecting. |
| AR-03 | SHOULD-FIX | stderr collection was unbounded and rejection could race process closure. | Added a 64 KiB stderr cap, stable timeout/output error codes, close-before-reject behavior, and retrying temporary cleanup. |
| AR-04 | SHOULD-FIX | Package smoke started `bin/nomue-mcp.js` with Node, bypassing the executable shim users receive from npm. | Pack/install now runs lifecycle scripts, uses a path containing spaces, and starts `node_modules/.bin/nomue-mcp` or its Windows `cmd.exe` equivalent. |
| AR-05 | SHOULD-FIX | Independent replay evidence identified stdout but not the exact input bytes or the verifier-generated volatile field. | Added UTF-8 input SHA-256 and `replay-volatile-fields: ["generated_at"]` metadata without altering the verifier artifact. |
| AR-06 | SHOULD-FIX | The README overclaimed uniform direct `npx` resolution across clients and Windows. | Added a `cmd.exe` fallback and made clean-profile client validation an explicit live release gate. |
| AR-07 | SHOULD-FIX | A publishable CLI lock was absent, so consumer npm could re-resolve the reviewed runtime tree. | Replaced the source-only lock with published `npm-shrinkwrap.json`; package smoke requires it and verifies exact direct pins. |
| AR-08 | SHOULD-FIX | CI used mutable action tags and default persisted checkout credentials. | Pinned action SHAs, set read-only workflow permissions, disabled persisted credentials, and added job timeouts. |
| AR-09 | DOCUMENT | MCP string transport cannot express malformed UTF-8 byte sequences. | Documented the boundary and directs that byte-level negative case to the npm verifier CLI. |
| AR-10 | DOCUMENT | Separate verifier runs cannot be byte-identical because the upstream verifier creates a fresh `generated_at`. | Preserved same-invocation stdout bytes and hash; replay tests require equality of all nonvolatile fields. No timestamp is stripped or forged. |

<!-- markdownlint-enable MD013 -->

## Executed evidence

<!-- markdownlint-disable MD013 -->

| Check | Result |
| --- | --- |
| Source tests, Node 20 | 6/6 pass |
| Source tests, Node 22 | 6/6 pass |
| Source tests, current Node 24 | 6/6 pass |
| Packed install/public shim smoke, Node 20 | pass |
| Packed install/public shim smoke, Node 22 | pass |
| Packed install/public shim smoke, Node 24 | pass |
| Local tarball through npm-exec plus official MCP client | tool list and valid call pass |
| Valid report | exit 0, one text block, parsed structured content equal to that block |
| Scoped mismatch | exit 2 preserved as a normal verifier artifact |
| Empty and malformed JSON | verifier exit-2 parse refusal preserved |
| Duplicate JSON member | `NRS-DUPLICATE-JSON-MEMBER` preserved |
| Unsupported bundle | exit-3 routing refusal preserved |
| Oversized Record | exit-4 resource refusal preserved |
| Independent npm verifier replay | all fields equal except `generated_at` |
| Input/output hashes | recomputed hashes match MCP metadata |
| Tool discovery | exactly one tool; `Use when`, `Do not use`, and next action present |
| Startup after installation | under 10 seconds in all executed smoke runs |
| Official MCP Registry schema | structural validation pass |
| Cursor deeplink payload | decodes to the version-pinned stdio config |
| Production and complete npm audit | 0 known vulnerabilities |
| npm publish dry-run | pass with public access and explicit `rc` tag |
| Pack contents | 17 files; executable mode retained; shrinkwrap included |
| JavaScript syntax and whitespace | pass |

<!-- markdownlint-enable MD013 -->

The untagged prerelease publish dry-run was also exercised and correctly
refused by npm. The accepted release command must retain `--tag rc`; moving
`latest` is outside this release-candidate review.

## Claims that remain prohibited

- Do not claim literal byte equality between two separate verifier invocations.
- Do not claim Windows/macOS or named-client release testing until public CI
  and clean-profile checks have passed.
- Do not claim npm, MCP Registry, Cursor, or Cline publication before each live result
  is checked separately.
- Do not update the official site or `llms.txt` from “not open” to “available” before
  the live npm package and repository are verified.
- Do not describe malformed-UTF-8 byte testing as available through MCP string input.
- Do not add paired-t, Wilcoxon, Mann-Whitney, raw-sample calculation, method selection,
  blanket `VERIFIED`, or scientific-validity claims to this Release 1 tool.

## Remaining release gates

1. Create and push the public `licklider-ai/nomue-mcp` repository at this reviewed
   source state.
2. Let the six public OS/Node matrix jobs and production audit finish successfully.
3. Publish `@licklider/nomue-mcp@0.1.0-rc.0` with public access and the `rc` dist-tag;
   verify live version, integrity, files, and dist-tags.
4. Run clean-profile calls in Claude Desktop, Cursor, and Cline, including the Windows
   fallback where applicable.
5. Publish to the official MCP Registry, then perform the separate Cursor and Cline
   directory submissions. Record readiness and acceptance as different events.
6. Only after the live checks, update the official website, docs, and both `llms.txt`
   surfaces using the same tool description and non-claim boundary.
