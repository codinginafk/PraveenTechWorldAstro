---
name: omniroute-integration
description: "Guidelines and instructions to offload tasks to OmniRoute (AI gateway). Explains the API endpoints, active credentials, and how to invoke its A2A agent protocol or 37+ MCP tools."
---

# OmniRoute Integration Workspace Skill

This skill documents how to programmatically offload agent tasks to the local OmniRoute gateway running at `http://localhost:20128`.

## 1. Gateway Status & Active Keys
The OmniRoute service is hosted locally on port `20128`. Two active credentials have been provisioned in the database (`storage.sqlite`):
1. **Antigravity FSM Key:** `omniroute-resilience-key` (used for state machine LLM completions).
2. **Praveen Tech ID Key:** `omniroute-praveentech-key` (the user's personalized access key).

Always set the `Authorization: Bearer <key>` header on all completions and tool invocation requests.

---

## 2. Offloading Tasks via A2A (Agent-to-Agent) Protocol
OmniRoute implements the A2A Protocol v0.3. Tasks can be dispatched asynchronously or synchronously via JSON-RPC 2.0 to the endpoint:
`http://localhost:20128/a2a`

### Direct Task Handoff Format (`message/send`):
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "message/send",
  "params": {
    "skill": "smart-routing",
    "messages": [{"role": "user", "content": "Explain quantum computing using the cheapest provider"}],
    "metadata": {
      "model": "auto",
      "budget": 0.05
    }
  }
}
```

### Supported A2A Skills:
- `smart-routing`: Dispatches prompts through intelligent model selection and fallback trees.
- `quota-management`: Solicits natural-language information about remaining provider quotas.
- `cost-analysis`: Reviews spend logs across active sessions and models.
- `health-report`: Displays circuit breaker statuses and provider latencies.

---

## 3. Exposing 37+ Advanced MCP Tools
OmniRoute contains a Model Context Protocol (MCP) server. To run the server locally over `stdio` for integration into IDEs (VS Code, Cursor, Claude Code) or subagents, use:
```bash
# Execute local stdio server
npx tsx open-sse/mcp-server/server.ts
```

### Key Tool Categories:
1. **GitHub Tools (`githubSkillTools.ts`):** Search, scan, and install external agent skills.
2. **Notion Tools (`notionTools.ts`):** Search pages, read database entries, and append blocks.
3. **Obsidian Tools (`obsidianTools.ts`):** Query local vault markdown notes, tags, and files.
4. **Compression Tools (`compressionTools.ts`):** Compact outputs, filter tokens, and compress schemas.
5. **Pool & Quota Tools (`poolTools.ts`):** Monitor rate limits and allocate quotas between keys.

---

## 4. Helper Script Reference
To test OmniRoute API calls, you can invoke the local test scripts:
- [test_models.mjs](file:///C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/scratch/test_models.mjs): Evaluates latency and availability of registered providers.
- [check_conn_status.mjs](file:///C:/Users/bunny/Downloads/00Resume/Building_Tech_Website/scratch/check_conn_status.mjs): Lists active sqlite connection states.
