# Docmost OSS MCP Shim

A lightweight Node.js bridge between AI agents (like **Cursor**, **Claude Desktop**, or any Model Context Protocol tool) and your **self‑hosted Docmost OSS instance**.

## ✨ Features

- 🔌 **Plug & Play MCP Integration** - Works with Cursor, Claude Desktop, and any MCP-compatible AI agent
- 🐳 **Docker Ready** - Deploy in seconds with Docker Compose on any platform
- 🥧 **Raspberry Pi Compatible** - Runs perfectly on ARM devices
- 🔒 **Secure** - API key authentication and session management
- 🔍 **Full-Text Search** - Search your documentation from within your IDE
- 📚 **Space Management** - List and browse all your Docmost spaces
- 🚀 **Auto-Authentication** - Handles Docmost login and cookie management automatically
- 📦 **Zero Dependencies on Docmost** - Works with any self-hosted Docmost OSS instance (v0.23+)

---

# 🤖 For MCP Users (AI Agents)

## Quick Start with Cursor

Add this to your Cursor MCP configuration (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "docmost": {
      "command": "npx",
      "args": ["-y", "--package=github:dJPoida/docmost-oss-mcp-shim#v0.2.27", "docmost-mcp"],
      "env": {
        "MCP_DOCMOST_SHIM_URL": "http://YOUR_SHIM_SERVER_IP:3888",
        "MCP_SHIM_KEY": "your-secure-random-string"
      }
    }
  }
}
```

**Configuration:**

- Replace `YOUR_SHIM_SERVER_IP` with the IP address of your shim server (e.g., your Raspberry Pi)
- Replace `your-secure-random-string` with the same `SHIM_API_KEY` configured on your shim server
- Update the version tag (`#v0.2.27`) to match the latest release

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

## Example Usage in Cursor

Simply ask Cursor natural language questions, and it will use the Docmost tools automatically:

- **"Search my Docmost for deployment documentation"**
- **"List all my Docmost spaces"**
- **"Create a new page called 'API Reference' in the General space"**
- **"Find pages about environment variables"**

Cursor will discover your documentation and help you navigate it without leaving your IDE!

---

# 🛠️ For Shim Server Operators

## 🚀 Why This Exists

The open‑source edition of Docmost doesn't expose API keys or external automation features.  
This shim fills that gap by acting as an authenticated bridge between AI agents and your Docmost instance.

✅ No enterprise license required  
✅ No manual cookie management  
✅ Simple REST API for AI agents  
✅ Production-ready Docker deployment  
✅ Works on Raspberry Pi and ARM devices

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

Create a `.env` file in the project root:

```ini
# Docmost Connection (Required)
DOCMOST_BASE_URL=http://your-docmost-server:3000
DOCMOST_EMAIL=your-mcp-user@example.com
DOCMOST_PASSWORD=your-secure-password

# Shim Network Settings (Optional)
HOST=0.0.0.0  # Use 0.0.0.0 for Docker, 127.0.0.1 for local-only
PORT=3888

# Security (Required for remote access)
SHIM_API_KEY=your-secure-random-string

# Debug Logging (Optional)
DEBUG_SHIM=0  # Set to 1 for verbose logging
```

**Important:**

- Create a dedicated Docmost user for the shim (don't use your personal account)
- Use `HOST=0.0.0.0` for Docker deployments to allow external connections
- Generate a strong random string for `SHIM_API_KEY` in production

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

After a new version is released, MCP users can update their Cursor config to the latest version tag:

```json
{
  "mcpServers": {
    "docmost": {
      "command": "npx",
      "args": ["-y", "--package=github:dJPoida/docmost-oss-mcp-shim#v0.2.27", "docmost-mcp"]
    }
  }
}
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

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Create a `.env` file** with your Docmost credentials:

   ```ini
   DOCMOST_BASE_URL=http://your-docmost-server:3000
   DOCMOST_EMAIL=your-mcp-user@example.com
   DOCMOST_PASSWORD=your-secure-password
   SHIM_API_KEY=change-this-long-random-string
   DEBUG_SHIM=0
   ```

2. **Start the service**:

   ```bash
   docker-compose up -d
   ```

3. **Check logs**:

   ```bash
   docker-compose logs -f
   ```

4. **Stop the service**:
   ```bash
   docker-compose down
   ```

### Using Docker CLI

```bash
# Build the image
docker build -t docmost-oss-mcp-shim .

# Run the container
docker run -d \
  --name docmost-mcp-shim \
  --restart unless-stopped \
  -p 3888:3888 \
  -e DOCMOST_BASE_URL=http://your-docmost-server:3000 \
  -e DOCMOST_EMAIL=your-mcp-user@example.com \
  -e DOCMOST_PASSWORD=your-secure-password \
  -e SHIM_API_KEY=change-this-long-random-string \
  docmost-oss-mcp-shim
```

### Raspberry Pi Deployment

The Docker image is multi-arch and works on Raspberry Pi (ARM):

```bash
# On your Raspberry Pi
git clone https://github.com/dJPoida/docmost-oss-mcp-shim.git
cd docmost-oss-mcp-shim

# Create .env file with your settings
cat > .env << EOF
DOCMOST_BASE_URL=http://your-docmost-server:3000
DOCMOST_EMAIL=your-mcp-user@example.com
DOCMOST_PASSWORD=your-secure-password
SHIM_API_KEY=$(openssl rand -hex 32)
DEBUG_SHIM=0
EOF

# Start the service
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

**Performance Notes:**

- The default resource limits (0.5 CPU, 256MB RAM) work well on Raspberry Pi 3B+ and newer
- Adjust limits in `docker-compose.yml` if needed for older hardware

---

## 🔍 Troubleshooting

### MCP Connection Issues

**Problem:** Cursor shows "No server info found"

**Solutions:**

1. Verify the shim server is running: `curl http://YOUR_SERVER_IP:3888/health`
2. Check `MCP_DOCMOST_SHIM_URL` in `~/.cursor/mcp.json` is correct
3. Ensure `MCP_SHIM_KEY` matches the `SHIM_API_KEY` in your `.env` file
4. Restart Cursor after config changes

**Problem:** "Connection refused"

**Solutions:**

1. Ensure Docker container is running: `docker-compose ps`
2. Check if port 3888 is accessible: `telnet YOUR_SERVER_IP 3888`
3. Verify firewall rules allow connections to port 3888
4. For Docker: Ensure `HOST=0.0.0.0` in `.env` file

### Authentication Issues

**Problem:** "Invalid credentials" or "Login failed"

**Solutions:**

1. Verify credentials in `.env` file are correct
2. Test login manually in Docmost web UI
3. Check Docker logs: `docker-compose logs -f`
4. Enable debug logging: `DEBUG_SHIM=1` in `.env`

### Docker Issues

**Problem:** Container exits immediately

**Solutions:**

1. Check logs: `docker-compose logs`
2. Verify `.env` file exists and has correct format
3. Ensure Docmost server is accessible from Docker container
4. Try building fresh: `docker-compose down && docker-compose up --build`

**Problem:** "npm ci failed" during build

**Solution:** This is fixed in v0.2.27+. Update to latest version.

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
