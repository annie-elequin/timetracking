FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Set environment variables for the build
ENV HOST=0.0.0.0
ENV PORT=3001
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy the build output
COPY --from=builder /app/build /usr/share/nginx/html

# Add version file
COPY --from=builder /app/package.json /tmp/package.json
RUN VERSION=$(node -p "require('/tmp/package.json').version") && \
    echo $VERSION > /usr/share/nginx/html/version.txt && \
    rm /tmp/package.json

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"] 