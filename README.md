# Docmost OSS MCP Shim

A lightweight Node.js bridge between AI agents (like **Cursor MCP**, **Claude Code**, or any Model Context Protocol tool) and your **self‑hosted Docmost OSS instance**.

This shim uses the **same endpoints and cookie‑based authentication** as the official Docmost API (v0.23+). It allows agents to query, search, and edit documentation just like a logged‑in user.

---

# 🤖 For MCP Users (AI Agents)

## Quick Start with Cursor

Add this to your Cursor MCP configuration (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "docmost": {
      "command": "npx",
      "args": ["-y", "--package=github:dJPoida/docmost-oss-mcp-shim#v0.2.21", "docmost-mcp"],
      "env": {
        "MCP_DOCMOST_SHIM_URL": "http://YOUR_SHIM_SERVER_IP:3888",
        "MCP_SHIM_KEY": "change-this-long-random-string"
      }
    }
  }
}
```

**Note:** Replace `YOUR_SHIM_SERVER_IP` with the actual IP address of the machine running the Express shim server.

## Available Tools

Your AI agent can use these Docmost tools:

- **`docmost_listSpaces`** - List available workspaces/spaces
- **`docmost_search`** - Search for pages by query (supports optional `spaceId`)
- **`docmost_createPage`** - Create new page metadata (⚠️ content not supported)
- **`docmost_updatePage`** - Update page metadata (⚠️ content not supported)
- **`docmost_health`** - Check shim server health

### ⚠️ Current Limitations

**The Docmost OSS API does not currently support reading or writing page content.** This integration can:

✅ **What Works:**

- List spaces and their metadata
- Search pages and see content highlights/snippets
- Create page structure (title, parent, space)
- Update page metadata (title only)

❌ **What Doesn't Work:**

- Reading full page content
- Creating pages with content
- Updating page content

This makes the integration useful for **documentation discovery and navigation**, but not for content editing. Content must be edited manually in the Docmost UI.

## Example Usage

```javascript
// Search for documentation
await docmost_search({ query: 'deployment guide' });

// List available spaces
await docmost_listSpaces();

// Create a new page
await docmost_createPage({
  spaceId: 'space-123',
  title: 'New Documentation',
  content: 'This is the content...',
});

// Update an existing page
await docmost_updatePage({
  pageId: 'page-456',
  title: 'Updated Title',
  content: 'Updated content...',
});
```

---

# 🛠️ For Shim Server Operators

## 🚀 Why This Exists

The open‑source edition of Docmost doesn't expose API keys or external automation features.  
This shim fills that gap by acting as a local authenticated bridge.

✅ No enterprise license required  
✅ No manual cookies or tokens  
✅ Simple REST API agents can call locally

## ⚙️ Setup

### 1️⃣ Requirements

- Node **v22+**
- A running self-hosted **Docmost OSS** instance (Docker or bare-metal)
- A Docmost user account for the shim (e.g. `my.docmost.mcp.user@gmail.com`)

### 2️⃣ Installation

```bash
git clone https://github.com/dJPoida/docmost-oss-mcp-shim.git
cd docmost-oss-mcp-shim
npm install
```

### 3️⃣ Configuration

Create a `.env` file based on `.env.example`:

```ini
DOCMOST_BASE_URL=YOUR_DOCMOST_BASE_URL
DOCMOST_EMAIL=YOUR_DEDICATED_MCP_USER_EMAIL
DOCMOST_PASSWORD=YOUR_DEDICATED_MCP_USER_PASSWORD

# Shim network settings
HOST=127.0.0.1
PORT=3888

# Optional: authentication for external clients (like MCP)
SHIM_API_KEY=change-this-long-random-string

# Debug logging
DEBUG_SHIM=1
```

## ▶️ Run

```bash
npm start
```

Then verify:

```bash
curl http://127.0.0.1:3888/health
# → {"ok":true}
```

## 🧠 How It Works

All Docmost endpoints use **POST** requests behind `/api/*`.  
The shim mirrors that behavior and manages session cookies automatically.

| Shim Endpoint | Upstream Docmost API | Method | Description                      |
| ------------- | -------------------- | ------ | -------------------------------- |
| `/spaces`     | `/api/spaces`        | POST   | List available workspaces/spaces |
| `/search`     | `/api/search`        | POST   | Search pages by query            |
| `/pages`      | `/api/pages/create`  | POST   | Create new page                  |
| `/pages`      | `/api/pages/update`  | POST   | Update existing page             |

Authentication is handled via the `authToken` cookie issued by `/api/auth/login`.  
The shim logs in automatically and refreshes sessions when expired.

## 🔒 Security

- **Do not** expose this server to the public internet.  
  Keep it bound to localhost or behind a reverse proxy.
- Use a **dedicated Docmost account** for automation.
- Protect the `.env` file; it contains login credentials.
- Enable `SHIM_API_KEY` if you expect external tools to connect.

---

## 🧪 Testing Endpoints

```bash
# Health check
curl http://127.0.0.1:3888/health

# List spaces
curl -H "X-SHIM-KEY: change-this-long-random-string"      http://127.0.0.1:3888/spaces | jq .

# Search for pages
curl -X POST -H "Content-Type: application/json"      -H "X-SHIM-KEY: change-this-long-random-string"      -d '{"query": "Docmost"}'      http://127.0.0.1:3888/search | jq .

# Create new page
curl -X POST -H "Content-Type: application/json"      -H "X-SHIM-KEY: change-this-long-random-string"      -d '{"spaceId": "YOUR_SPACE_ID", "title": "MCP Test Page", "content": "Hello world"}'      http://127.0.0.1:3888/pages | jq .

# Update page
curl -X PUT -H "Content-Type: application/json"      -H "X-SHIM-KEY: change-this-long-random-string"      -d '{"pageId": "YOUR_PAGE_ID", "title": "MCP Test Page (Updated)"}'      http://127.0.0.1:3888/pages | jq .

# Debug current session / cookies
curl http://127.0.0.1:3888/debug/session | jq .
```

---

## 🧑‍💻 Development

```bash
npm run build  # compile TypeScript MCP server
npm run lint    # run ESLint
npm run format  # format with Prettier
DEBUG_SHIM=1 npm start  # enable verbose logging
```

**Note:** The MCP server is written in TypeScript and must be compiled before use. The pre-commit hook automatically builds and includes the compiled files in commits.

### Publishing New Versions

#### Automatic Version Bumping

The project automatically bumps the patch version on every commit:

- **Every commit** automatically bumps the patch version (0.2.9 → 0.2.10)
- **Works with any git tool** - IDE sidebar, command line, etc.
- **Create tags** when ready to release:
  ```bash
  npm run tag  # Creates git tag from current version
  git push --tags  # Push tags to remote
  ```

#### Manual Version Management

For major/minor version changes:

1. **Manually update version** in `package.json` (e.g., 0.2.7 → 0.3.0)
2. **Commit and tag**:
   ```bash
   git commit -am "commit message"
   git tag <version>
   git push && git push --tags
   ```

#### MCP Users Update

After a new version is released, MCP users can update their Cursor config:

```json
"--package=github:dJPoida/docmost-oss-mcp-shim#v0.2.21"
```

### Project structure

```
src/
  server.js          # Express shim server (runs on remote machine)
  routes.js          # defines REST endpoints
  docmostClient.js   # handles login, cookies, API calls
  logger.js          # lightweight debug logger

mcp/
  docmost-server.ts # MCP server TypeScript source

dist/mcp/
  docmost-server.js # Compiled MCP server (runs on developer's machine via Cursor)
```

**Two-Server Architecture:**

- **Express Shim Server** (`src/`) - Runs on remote machine, connects to Docmost OSS
- **MCP Server** (`mcp/`) - Runs on developer's machine, connects to Express shim

---

## 🐳 Docker

```bash
docker build -t docmost-oss-mcp-shim .
docker run -d --env-file .env -p 127.0.0.1:3888:3888 docmost-oss-mcp-shim
```

---

## 🩵 License

MIT — freely reusable for self‑hosted setups.  
Not affiliated with the official Docmost project.

---

## 🔁 Architecture Overview

```mermaid
flowchart LR
  subgraph A[AI Agent / Cursor MCP]
    X1["docmost_search()"]
    X2["docmost_createPage()"]
  end

  subgraph B[MCP Server TypeScript]
    M1["docmost_search"]
    M2["docmost_createPage"]
    M3["docmost_listSpaces"]
  end

  subgraph C[Express Shim Server]
    S1["/search (POST)"]
    S2["/pages (POST/PUT)"]
    S3["/spaces (POST)"]
  end

  subgraph D[Docmost OSS Server]
    D1["/api/search"]
    D2["/api/pages/create"]
    D3["/api/spaces"]
  end

  A -->|MCP Protocol| B
  B -->|HTTP + X-SHIM-KEY| C
  C -->|authToken cookie| D
```
