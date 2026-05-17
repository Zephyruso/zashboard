FROM --platform=linux/amd64 docker.io/guergeiro/pnpm:lts-latest AS builder

WORKDIR /build

COPY . .

RUN pnpm install
RUN pnpm build

FROM docker.io/caddy:alpine

EXPOSE 80

WORKDIR /srv

COPY --from=builder /build/dist/. .
COPY Caddyfile .

CMD ["caddy", "run"]
