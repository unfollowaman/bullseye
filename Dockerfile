FROM node:22-bookworm-slim

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install system dependencies: FFmpeg, fonts, and curl for health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definition files
COPY package.json package-lock.json ./

# Install npm dependencies
RUN npm ci

# Install exact matching Playwright Chromium browser binaries and OS dependencies
RUN npx playwright install --with-deps chromium

# Copy application source code
COPY . .

# Build Next.js application
RUN npm run build

# Create persistence directories for SQLite database and capture outputs
RUN mkdir -p /app/data /app/public/captures

# Expose default HTTP port (Railway overrides PORT dynamically at runtime)
EXPOSE 3000

# Container health check querying /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start Next.js production server
CMD ["npm", "start"]
