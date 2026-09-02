# Postpublication adversarial review

Date: 2026-09-02

## Decision

**GO for the published npm release candidate, local stdio use, the official MCP
Registry entry, and the public documentation release. Conditional GO for Cursor
Marketplace submission after a clean-profile local Cursor check. NO-GO for Cline
Marketplace submission while its form requires a stable-and-ready affirmation that
conflicts with the package's explicit release-candidate status.**

This decision does not convert the release candidate into a stable release and does
not claim acceptance by Cursor or Cline.

## Findings and repairs

<!-- markdownlint-disable MD013 -->

| ID | Severity | Adversarial finding | Disposition |
| --- | --- | --- | --- |
| PAR-01 | BLOCKER | The original 10-second verifier subprocess ceiling reused the MCP startup budget and produced false `verifier_timeout` failures on a cold Windows host. | Separated the budgets: startup and tool discovery remain under 10 seconds; each verifier child has a 60-second fail-closed ceiling. Windows rerun passed 6/6 source tests and package smoke. |
| PAR-02 | SHOULD-FIX | npm automatically added `latest` on the package's first publication even though `--tag rc` was supplied, and rejected removal with HTTP 400. Destructive workarounds would create more release risk. | Kept the immutable package, recorded the registry-created tag, required `rc -> 0.1.0-rc.0`, and exact-pinned every client and registry command. No stable-release claim is derived from `latest`. |
| PAR-03 | BLOCKER | “Bit-exact independent replay” is not literally possible across separate verifier processes because the verifier generates a fresh top-level `generated_at`. | Limited byte-preservation claims to the same underlying invocation, published input/output hashes, and required independent equality of every other field. The timestamp is neither stripped nor forged. |
| PAR-04 | SHOULD-FIX | Interactive registry login would force the publisher to transfer an auth-only task and encourage reusable secret handling. | Added a dedicated GitHub Actions OIDC workflow with job-scoped `id-token: write`, a version-and-digest-pinned publisher, schema validation, and an exact live-entry assertion. |
| PAR-05 | SHOULD-FIX | The earlier Cursor handoff targeted generic MCP directories, while current Cursor Marketplace review expects a Plugin manifest in a public Git repository. | Added `.cursor-plugin/plugin.json`, root `mcp.json`, explicit RC metadata, a constrained repository validator, and CI coverage. The configuration still invokes the exact npm release over local stdio with no variables, secrets, or URLs. |
| PAR-06 | BLOCKER FOR CLINE | Cline's current issue form requires the submitter to affirm that the server is stable and ready for public use. | Deferred submission. Do not check that box while the package is `0.1.0-rc.0`; revisit after the stable-release decision or a documented prerelease route. |
| PAR-07 | SHOULD-FIX | npm/Registry availability without matching website, docs, news, and `llms.txt` language would create discoverability and claim drift. | Published exact package, transport, tool boundary, version, replay limitation, and non-claims across the official surfaces. Production build and four live URL/content checks passed. |
| PAR-08 | DOCUMENT | A public local MCP wrapper could be mistaken for completion of private app MCP integration. | Recorded `LINT-076` as the direct app integration boundary and `LINT-096` as required-for-close adjacency. The public wrapper does not close app catalog, session, authenticated ingress, or orchestration work. |

<!-- markdownlint-enable MD013 -->

## Verified evidence

- npm package: `@licklider/nomue-mcp@0.1.0-rc.0`
- npm integrity:
  `sha512-zw32HCe45LyA0V68qRGV/4m3BD+FFa3Gc+7SHyUHJb0WvFLpmsbI/Ww0YeZLZnb1HX610rgKj5ZqrD9mAIy/qA==`
- npm source commit: `f65f5adc4589555ed33863b7f790503ff2d46518`
- release channel: `rc -> 0.1.0-rc.0`
- public matrix: Linux, macOS, Windows on Node.js 20 and 22; all six package
  jobs plus the production dependency audit passed
- official MCP Registry name: `io.github.licklider-ai/nomue-mcp`
- official Registry publication workflow run: `33577994163`, success
- latest package/main CI run before this Cursor wrapper: `33577994147`, all seven
  jobs successful
- official site commit: `a572ec9049aa0cbbc82476685f6a3cbea6c33eab`
- official site build run: `33579318060`, success
- production checks: MCP Markdown, root `llms.txt`, docs `llms.txt`, and MCP news
  page returned HTTP 200 with the expected package/tool/Registry markers
- Cursor wrapper: official Cursor schema validation, local constrained validation,
  existing 6/6 server tests, packed-install smoke, and production audit all passed

## Remaining human-only gates

1. Test the repository Plugin wrapper in a clean local Cursor profile, then submit the
   public repository at <https://cursor.com/marketplace/publish>. Record acceptance
   only after a live listing exists.
2. Do not submit the Cline issue while its required stable affirmation remains
   incompatible with the release candidate.
3. Run named-client clean-profile checks for Claude Desktop and Cline before upgrading
   their “configuration available” status to “release-tested”.

## Claim discipline

- `latest` does not mean this package is stable; the exact status is release candidate.
- Official MCP Registry publication does not imply Cursor or Cline acceptance.
- The wrapper verifies a complete supported nomue Record; it does not calculate a new
  Welch test from raw samples, select a method, or judge scientific truth or causality.
- Paired-t, Wilcoxon, Mann-Whitney, hosted HTTP, authentication, billing, logging, SLA,
  and app orchestration remain outside this Phase 1 release.
- No blanket `VERIFIED` verdict is emitted.
