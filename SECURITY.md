# Security Policy

The Phase 1 MCP server is local-only and supports stdio transport. After npm has
installed its dependencies, it does not require network access, an API key, an account,
or a hosted nomue service.

The server writes each supplied Record JSON string to a mode-`0600` file in a private
temporary directory, invokes the CLI implementation from the exact pinned
`@licklider/nomue-verifier` package, and removes the directory in a retrying `finally`
path. It passes only a small allowlist of operating-system environment variables to the
verifier process. It does not dereference Record-supplied URIs or execute
Record-supplied code.

Each verifier invocation has a 60-second adapter timeout, an 8 MiB stdout limit, and a
64 KiB stderr limit. The verifier independently owns its Record-size and semantic
resource refusals. Adapter limits produce an MCP tool error rather than a synthetic
verifier refusal.

Two local-transport boundaries remain explicit:

- an MCP string cannot represent malformed UTF-8 bytes, so that negative case must be
  exercised directly through `@licklider/nomue-verifier`;
- a hard process kill, operating-system crash, or power loss can prevent the normal
  cleanup path, leaving the private file for the operating system's temporary-file
  cleanup policy.

Report suspected vulnerabilities privately at:

https://github.com/licklider-ai/nomue-verifier-mcp/security/advisories/new

Do not include private Records, unpublished data, credentials, or exploit details in a
public issue.
