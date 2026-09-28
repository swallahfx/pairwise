FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

# Next.js inlines NEXT_PUBLIC_* vars into the client bundle at build time,
# not at container start — env_file/environment on the running container
# is too late. docker-compose.yml passes these in as build args (sourced
# from frontend/.env), so they need to become real env vars here before
# `next build` runs.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
