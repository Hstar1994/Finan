# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove package-lock if it exists and install dependencies
RUN rm -f package-lock.json && \
    npm install --legacy-peer-deps

# Copy source files
COPY . .

# Set environment variables for build
ENV VITE_API_URL=http://localhost:3000/api

# Build the React app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
