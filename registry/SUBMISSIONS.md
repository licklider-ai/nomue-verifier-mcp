# Registry and directory submission handoff

Complete these steps in order after the `licklider-ai/nomue-mcp` repository is public
at the source commit that will be represented by the package.

## 0. npm release candidate

Publish the prerelease under the explicit `rc` dist-tag, then verify the live package
metadata before any registry submission:

```bash
npm publish --access public --tag rc
npm view @licklider/nomue-mcp@0.1.0-rc.0 version dist-tags dist.integrity
```

The npm public registry may automatically create `latest` for a package's first-ever
publication even when `--tag rc` is used. If `npm dist-tag rm ... latest` then returns
HTTP 400, record that registry-created state; do not unpublish the immutable version or
publish a placeholder stable version to work around it. The required release-channel
assertion is that `rc` resolves to `0.1.0-rc.0`. All client and registry examples must
continue to pin the exact prerelease version. Do not intentionally add or move `latest`
during a release-candidate publication.

## 1. Official MCP Registry

The checked-in `server.json` uses the official schema, exact npm version, stdio-only
transport, and npm ownership field `mcpName=io.github.licklider-ai/nomue-mcp`. The
checked-in publish workflow authenticates with GitHub Actions OIDC, so it does not
require a reusable token or an interactive browser login. It pins both the publisher
release and its SHA-256 digest.

```bash
gh workflow run publish-mcp-registry.yml
```

Updating `server.json` on `main` also runs the workflow. Keep `id-token: write`
scoped to this registry-publish workflow and do not combine npm publication with the
registry metadata publication.

Confirm the registry entry reports:

- name: `io.github.licklider-ai/nomue-mcp`
- package: `@licklider/nomue-mcp@0.1.0-rc.0`
- transport: `stdio`
- no environment variables and no remote endpoint

## 2. Cursor

The README contains a version-pinned Add to Cursor deeplink and the equivalent
`mcp.json` entry. Cursor's public documentation currently documents custom `mcp.json`,
install deeplinks, its own marketplace, and the community `cursor.directory`; it does
not provide a repository-owned direct submission API equivalent to the official MCP
Registry publisher.

After npm publication:

1. Test the checked-in deeplink in a clean Cursor profile.
2. Confirm the listed tool description includes both `Use when` and `Do not use`.
3. Submit the public repository to `cursor.directory` through its then-current
   publisher route if a directory listing is desired.

Do not describe the server as registered with Cursor until an actual directory or
marketplace listing exists.

## 3. Cline MCP Marketplace

Open an issue in `cline/mcp-marketplace` with:

**GitHub repository URL**

```text
https://github.com/licklider-ai/nomue-mcp
```

**Logo URL**

```text
https://raw.githubusercontent.com/licklider-ai/nomue-mcp/main/assets/licklider-400.png
```

**Reason for addition**

```text
nomue MCP gives Cline a zero-auth, local-only way to independently verify scoped
properties of a nomue Protocol Release 1 Welch Record. It delegates to the exact
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
