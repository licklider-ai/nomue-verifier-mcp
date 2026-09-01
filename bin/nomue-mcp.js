#!/usr/bin/env node

import { startServer } from "../src/server.js";

startServer().catch(() => {
  process.stderr.write("nomue-mcp: failed to start the local MCP server\n");
  process.exitCode = 1;
});
