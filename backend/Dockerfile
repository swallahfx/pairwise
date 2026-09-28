FROM node:20-alpine AS base
WORKDIR /app
# Prisma's engine binaries need libssl to run; plain node:20-alpine doesn't
# ship it, which makes `prisma migrate deploy` crash-loop at container
# start with an opaque "Could not parse schema engine response" error.
RUN apk add --no-cache openssl
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/server.js"]
