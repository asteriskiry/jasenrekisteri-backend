FROM node:24.16.0-bookworm-slim@sha256:2c87ef9bd3c6a3bd4b472b4bec2ce9d16354b0c574f736c476489d09f560a203 AS build
WORKDIR /app
ENV HUSKY=0 MONGOMS_DISABLE_POSTINSTALL=1
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run swagger && npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:24.16.0-bookworm-slim@sha256:2c87ef9bd3c6a3bd4b472b4bec2ce9d16354b0c574f736c476489d09f560a203 AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 LOGPATH=/app/logs
WORKDIR /app
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/swagger.json ./swagger.json
RUN mkdir -p /app/logs /app/data && chown -R node:node /app/logs /app/data
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
