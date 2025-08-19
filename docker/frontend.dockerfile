# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the frontend code
COPY frontend/ ./

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built application from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Set default environment variables
ENV API_HOSTNAME=backend
ENV API_PORT=80
ENV API_PROTOCOL=http
ENV STORAGE_ACCOUNT_NAME=devstoreaccount1

# Expose the port the app will run on
EXPOSE 3000

# Start the production server
CMD ["npm", "run", "start"]
