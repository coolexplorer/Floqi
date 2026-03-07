FROM node:20-bullseye

# ============================================================
# Go 1.23 설치
# ============================================================
RUN wget -q https://go.dev/dl/go1.23.0.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.23.0.linux-amd64.tar.gz && \
    rm go1.23.0.linux-amd64.tar.gz

ENV PATH=$PATH:/usr/local/go/bin
ENV GOPATH=/go
ENV PATH=$PATH:$GOPATH/bin

# ============================================================
# 개발 도구 설치
# ============================================================
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Go 디버거 (dlv) 설치
RUN go install github.com/go-delve/delve/cmd/dlv@latest

WORKDIR /workspace
