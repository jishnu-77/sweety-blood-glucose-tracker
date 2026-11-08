FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV NODE_ENV=production
EXPOSE 5000
# Create the tables if they do not exist yet, then start the API.
CMD ["sh", "-c", "node src/db/migrate.js && node src/server.js"]
