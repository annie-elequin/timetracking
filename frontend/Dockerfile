FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

# Set the host to 0.0.0.0 to bind to all interfaces
ENV HOST=0.0.0.0

CMD ["npm", "start"] 