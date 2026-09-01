# Install nomue MCP

Add this single server entry to an MCP client configuration:

```json
{"nomue":{"command":"npx","args":["--yes","@licklider/nomue-mcp@0.1.0-rc.0"]}}
```

For clients whose file format wraps entries in `mcpServers`:

```json
{"mcpServers":{"nomue":{"command":"npx","args":["--yes","@licklider/nomue-mcp@0.1.0-rc.0"]}}}
```

Windows fallback for clients that do not resolve npm command shims directly:

```json
{"nomue":{"command":"cmd.exe","args":["/d","/s","/c","npx --yes @licklider/nomue-mcp@0.1.0-rc.0"]}}
```

No environment variables, API keys, accounts, URLs, or network transport are required.
The package exposes one read-only tool, `verify_nomue_welch_record`. Pass a complete
nomue Record as JSON text in `record_json`.

Pass even an empty or malformed candidate unchanged; refusal semantics belong to the
pinned verifier, not the MCP adapter. MCP strings cannot carry malformed UTF-8 byte
sequences, so use the verifier CLI for that byte-level negative case.

Do not use it for raw-data Welch calculation, method selection, overall scientific
validity, paired-t, Wilcoxon, Mann-Whitney, or unsupported Protocol bundles.
