FROM node:20-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

COPY dist/ ./dist/

ENV TRANSPORT=http
ENV PORT=4000

EXPOSE 4000
CMD ["node", "dist/index.js"]
