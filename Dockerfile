FROM node:18-alpine

# System tools (z. B. OpenSSL für Prisma)
RUN apk add --no-cache openssl

# Port konfigurieren
EXPOSE 3000

# Arbeitsverzeichnis setzen
WORKDIR /app

# Umgebung setzen
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Dependencies installieren
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Shopify CLI im Container nicht nötig
RUN npm remove @shopify/cli || true

# Quellcode kopieren
COPY . .

# Remix Build ausführen
RUN npm run build

# Prisma Client generieren
RUN npx prisma generate

# Startkommando
CMD ["npm", "run", "docker-start"]
