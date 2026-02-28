# Build Stage
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.ts ./
COPY --from=build /app/.env.example ./.env
RUN npm install --production
RUN npm install -g vite-node tsx

EXPOSE 3000
CMD ["npx", "vite-node", "server.ts"]
