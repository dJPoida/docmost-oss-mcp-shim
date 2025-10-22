# Use Node.js 22 Alpine for smaller image size
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled TypeScript output
COPY dist/ ./dist/

# Expose the default port
EXPOSE 3888

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3888/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the Express shim server
CMD ["node", "dist/server/server.js"]

