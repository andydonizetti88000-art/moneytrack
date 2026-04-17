FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Build React client
COPY client/package.json ./client/
RUN cd client && npm install

COPY . .
RUN cd client && npm run build

# Create data directory for SQLite
RUN mkdir -p /data
ENV DB_PATH=/data
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
