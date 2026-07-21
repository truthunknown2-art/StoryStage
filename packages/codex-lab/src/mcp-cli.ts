import { createE1McpSceneContextServer } from "./mcp-scene-context";
import { E1McpBoundedStdioTransport } from "./mcp-stdio-transport";

try {
  const server = await createE1McpSceneContextServer();
  const transport = new E1McpBoundedStdioTransport();
  server.server.onerror = () => {
    process.stderr.write(
      "MCP_PROTOCOL_FAILED: bounded stdio rejected input.\n",
    );
    process.exitCode = 1;
    void transport.close();
  };
  await server.connect(transport);
} catch {
  process.stderr.write(
    "MCP_STARTUP_FAILED: bounded synthetic scene unavailable.\n",
  );
  process.exitCode = 1;
}
