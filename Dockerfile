# Multi-stage Dockerfile for Tak tudy!
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source files
COPY . .

# Build frontend and backend
RUN npm run build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

# Create persistent data directory for SQLite
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data

EXPOSE 3001

CMD ["npm", "start"]
