.PHONY: build test run lint clean

BINARY_NAME=floqi-worker
BUILD_DIR=./bin
MAIN=./cmd/worker

## build: Compile the worker binary
build:
	@mkdir -p $(BUILD_DIR)
	go build -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN)

## test: Run all tests
test:
	go test ./... -v

## run: Build and run the worker (requires .env file)
run: build
	$(BUILD_DIR)/$(BINARY_NAME)

## lint: Run golangci-lint
lint:
	golangci-lint run ./...

## vet: Run go vet
vet:
	go vet ./...

## clean: Remove build artifacts
clean:
	rm -rf $(BUILD_DIR)

## help: Show available targets
help:
	@grep -E '^## ' Makefile | sed 's/## /  /'
