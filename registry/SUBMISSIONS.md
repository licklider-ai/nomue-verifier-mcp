# Registry and directory submission handoff

Complete these steps in order after the repository has been renamed to
`licklider-ai/nomue-verifier-mcp` and the exact source commit represented by the
package is on `main`.

## 0. npm release candidate

Publish the prerelease under the explicit `rc` dist-tag, then verify the live package
metadata before any registry submission:

```bash
npm publish --access public --tag rc
npm view @licklider/nomue-verifier-mcp@0.2.0-rc.0 version dist-tags dist.integrity
```

This is the first publication under the explicit verifier-MCP package identity. Verify
the live dist-tags after publication. Do not publish a placeholder stable version or
move `latest` merely to hide prerelease status. All client and registry examples must
continue to pin the exact prerelease version. After the new package is confirmed live,
deprecate the old package without unpublishing its immutable versions:

```bash
npm deprecate "@licklider/nomue-mcp@*" "Renamed to @licklider/nomue-verifier-mcp; this package will not become the nomue product MCP."
```

## 1. Official MCP Registry

The checked-in `server.json` uses the official schema, exact npm version, stdio-only
transport, and npm ownership field
`mcpName=io.github.licklider-ai/nomue-verifier-mcp`. The
checked-in publish workflow authenticates with GitHub Actions OIDC, so it does not
require a reusable token or an interactive browser login. It pins both the publisher
release and its SHA-256 digest.

```bash
gh workflow run publish-mcp-registry.yml
```

The identity-migration release uses an explicit workflow dispatch after npm publication
and repository rename. Keep `id-token: write` scoped to this registry-publish workflow
and do not combine npm publication with registry metadata publication.

Confirm the registry entry reports:

- name: `io.github.licklider-ai/nomue-verifier-mcp`
- package: `@licklider/nomue-verifier-mcp@0.2.0-rc.0`
- transport: `stdio`
- no environment variables and no remote endpoint

## 2. Cursor

The repository contains a version-pinned Add to Cursor deeplink, a root `mcp.json`, and
the Cursor Plugin manifest `.cursor-plugin/plugin.json`. The wrapper has no variables,
secrets, rules, prompts, or network endpoint. Its metadata explicitly says
release-candidate, and `npm run test:cursor-plugin` checks the manifest's constrained
shape, paths, version alignment, and exact local stdio command.

After npm publication:

1. Clone this repository into `~/.cursor/plugins/local/nomue-verifier-mcp` (or symlink that
   directory to a clean checkout), then restart Cursor or run **Developer: Reload
   Window**.
2. In **Customize**, confirm the plugin is identified as `nomue-verifier-mcp`, contains exactly
   one MCP server, and requires no variables or credentials.
3. Confirm the discovered `verify_nomue_record` tool description includes both
   `Use when` and `Do not use`, and verify the included valid fixture.
4. Open <https://cursor.com/marketplace/publish> in the publisher's local browser and
   submit `https://github.com/licklider-ai/nomue-verifier-mcp` for manual review.

Cursor's Marketplace submission is a browser-authenticated, manually reviewed event;
it is not performed by the official MCP Registry workflow. Do not describe the server
as registered with Cursor until an accepted live Marketplace listing exists.

## 3. Cline MCP Marketplace

Open an issue in `cline/mcp-marketplace` with:

**GitHub repository URL**

```text
https://github.com/licklider-ai/nomue-verifier-mcp
```

**Logo URL**

```text
https://raw.githubusercontent.com/licklider-ai/nomue-verifier-mcp/main/assets/licklider-400.png
```

**Reason for addition**

```text
nomue Record Verifier gives Cline a zero-auth, local-only way to independently verify
scoped properties of nomue Protocol Records under explicitly supported bundles. The
current release supports the Release 1 Welch Record bundle. It delegates to the exact
published @licklider/nomue-verifier package, preserves scoped check versions, reason
codes, and non-asserted boundaries, and does not return a blanket VERIFIED verdict.
```

Before submitting, give a clean Cline instance only `README.md` or `llms-install.md`
and confirm it installs the pinned npm package, lists exactly one tool, and verifies the
included valid fixture without manual environment setup. Cline's current submission
form also requires the publisher to affirm that the server is stable and ready for
public use. Do not make that affirmation while this package is explicitly a release
candidate; submit after the stable-release decision or after Cline provides a
prerelease-specific route.

## Claim discipline

Publication to npm, the official MCP Registry, Cursor/cursor.directory, and the Cline
Marketplace are four separate events. Record each as complete only after its live URL
or registry response has been checked. Registry readiness is not registry acceptance.
