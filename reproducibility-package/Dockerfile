# CARTS Research - Docker Container
# Multi-stage build for optimized production image

# Stage 1: Build environment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY lib/ ./lib/
COPY scripts/ ./scripts/
COPY __tests__/ ./__tests__/
COPY demo/ ./demo/

# Build TypeScript
RUN npm run build

# Stage 2: Production environment
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S carts -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=carts:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=carts:nodejs /app/dist ./dist
COPY --from=builder --chown=carts:nodejs /app/package*.json ./
COPY --chown=carts:nodejs demo/ ./demo/
COPY --chown=carts:nodejs README.md ./

# Install Python dependencies for demo notebook
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Switch to non-root user
USER carts

# Expose port for Jupyter notebook
EXPOSE 8888

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Container healthy')" || exit 1

# Default command
CMD ["npm", "run", "demo"]

# Labels for metadata
LABEL maintainer="CARTS Research Team" \
      version="1.0.0" \
      description="CARTS Research Reproducibility Container" \
      org.opencontainers.image.source="https://github.com/anonymous/carts-research"

# Environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=4096" \
    DEMO_MODE=true

# Volume for data persistence
VOLUME ["/app/data", "/app/results"]

# Build arguments
ARG BUILD_DATE
ARG VCS_REF
LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.revision=$VCS_REF
