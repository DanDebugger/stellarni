# Stage 1: Build
FROM rust:1.81-slim-bullseye as builder

WORKDIR /app
COPY . .

# Build for release
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bullseye-slim

WORKDIR /app

# Install necessary runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary from the builder
COPY --from=builder /app/target/release/backend /usr/local/bin/backend

# Use the same port as our app defaults to, but it will be overridden by the PORT env var
EXPOSE 3000

CMD ["backend"]
