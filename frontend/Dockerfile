FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./

# Install ALL dependencies (including dev dependencies) for the build
RUN npm install

COPY . .

# Set environment variables for the build
ENV HOST=0.0.0.0
ENV PORT=3001
ENV NODE_ENV=production
ENV CI=true

# Build the application
RUN npm run build

# Generate version.txt in the build directory
RUN echo $(node -p "require('./package.json').version") > build/version.txt

# Production stage
FROM nginx:alpine

# Copy the build output (including version.txt)
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"] 