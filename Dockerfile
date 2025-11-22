FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run client:build

FROM node:18-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY identity-server ./identity-server
COPY --from=builder /app/client/dist ./client/dist
EXPOSE 4000
CMD ["npm", "run", "identity:start"]
