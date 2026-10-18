# Home Assistant may ignore build.yaml args and inject its own BUILD_FROM,
# so the repo URL and base images are hardcoded here.
FROM node:22-alpine AS build
ARG REPO_URL=https://github.com/arobe14039/patlite-show.git
ARG REPO_REF=main
RUN apk add --no-cache git bash curl && npm install -g bun
# CACHEBUST changes per add-on version so a rebuild pulls fresh source.
ARG BUILD_VERSION=dev
RUN echo "building ${BUILD_VERSION}" && git clone --depth 1 --branch "${REPO_REF}" "${REPO_URL}" /src
WORKDIR /src
RUN bun install
# Build a Node server instead of the default Cloudflare Worker bundle.
RUN NITRO_PRESET=node-server bun run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /src/.output /app/.output
COPY run.sh /run.sh
RUN chmod +x /run.sh
ENV PORT=8099 HOST=0.0.0.0 NODE_ENV=production
EXPOSE 8099
CMD ["/run.sh"]
