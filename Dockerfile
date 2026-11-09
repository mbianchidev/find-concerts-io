FROM node:26.12.1-bookworm-slim AS build
WORKDIR /app
ENV HUSKY=0 NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY .husky/install.mjs .husky/install.mjs
RUN npm ci
COPY . .
RUN npm run build

FROM node:26.12.1-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HUSKY=0 NEXT_TELEMETRY_DISABLED=1 DATABASE_PATH=/data/concerts.sqlite
COPY package.json package-lock.json ./
COPY .husky/install.mjs .husky/install.mjs
RUN npm ci --omit=dev && mkdir -p /data && chown node:node /data
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build /app/public ./public
COPY next.config.js tsconfig.json ./
COPY src/server ./src/server
COPY src/lib ./src/lib
COPY src/types ./src/types
COPY scripts ./scripts
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health/').then(r=>process.exit(r.ok?0:1)).catch(e=>{console.error(e.message);process.exit(1)})"
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0"]
