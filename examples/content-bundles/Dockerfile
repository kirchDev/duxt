FROM node:26.13.0-bookworm-slim AS source
WORKDIR /app
RUN npm install --global pnpm@12.16.1
COPY . .
# Keep source paths rooted at /app without shipping checkout metadata.
RUN mkdir -p .git && pnpm install --frozen-lockfile

FROM source AS build
WORKDIR /app/examples/content-bundles/site
RUN node ../../../apps/www/node_modules/nuxt/bin/nuxt.mjs build

FROM node:26.13.0-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/examples/content-bundles/site/.output ./
EXPOSE 3000
CMD ["node", "server/index.mjs"]

# Both targets inherit the same source and locked dependencies.
FROM source AS packer
WORKDIR /app/examples/content-bundles/site
ENTRYPOINT ["node", "../../../packages/duxt/bin/duxt.mjs", "content", "pack"]
