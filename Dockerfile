FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# EXPO_PUBLIC_ vars get inlined into the client bundle at export time, unlike
# the other secrets (which are only read at runtime) — so this one needs to
# be a build arg, passed via `build.args` in docker-compose.yml.
ARG EXPO_PUBLIC_GOOGLE_CLIENT_ID
ENV EXPO_PUBLIC_GOOGLE_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_CLIENT_ID

RUN npx expo export -p web

EXPOSE 3000
CMD ["npx", "expo", "serve", "dist", "--port", "3000"]
