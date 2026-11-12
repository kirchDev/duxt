FROM node:26.13.1-bookworm-slim AS source
WORKDIR /app
RUN npm install --global pnpm@12.16.1
COPY . .
# The fixture opts out with history: false: Git and checkout history are absent.
# This .git marker only keeps source paths rooted at /app.
RUN mkdir -p .git && pnpm install --frozen-lockfile
# This outside-workspace example shares www's installed consumer dependencies.
RUN ln -s ../../../apps/www/node_modules examples/content-bundles/site/node_modules

FROM source AS build
WORKDIR /app/examples/content-bundles/site
RUN node ../../../apps/www/node_modules/nuxt/bin/nuxt.mjs build

FROM node:26.13.1-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/examples/content-bundles/site/.output ./
EXPOSE 3000
CMD ["node", "server/index.mjs"]

# Both targets inherit the same source and locked dependencies.
FROM source AS packer
WORKDIR /app/examples/content-bundles/site
ENTRYPOINT ["node", "../../../packages/duxt/bin/duxt.mjs", "content", "pack"]
