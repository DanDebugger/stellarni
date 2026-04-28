#!/usr/bin/env bash
set -euo pipefail

echo "Deploying Stellarni smart contract to Soroban testnet..."

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
SOURCE_IDENTITY="default"
EXPECTED_ADMIN_WALLET="GATUMKHNJS547PR63EHHP5627LWSJ4ID4GXOUK5KYMLZIDL6Y44LE4IR"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACT_DIR="$ROOT_DIR/contracts/stellarni"
WASM_FILE="$CONTRACT_DIR/target/wasm32v1-none/release/stellarni.wasm"
OPT_WASM_FILE="$CONTRACT_DIR/target/wasm32v1-none/release/stellarni.optimized.wasm"
FRONTEND_CONFIG="$ROOT_DIR/frontend/src/contracts/config.ts"

# Ensure CLI is available
if ! command -v soroban >/dev/null 2>&1; then
  echo "Soroban CLI not found."
  echo "Install with: cargo install --locked soroban-cli --features opt"
  exit 1
fi

echo "Checking identity: $SOURCE_IDENTITY"
SOURCE_ADDRESS="$(soroban keys address "$SOURCE_IDENTITY" 2>/dev/null || true)"
if [ -z "$SOURCE_ADDRESS" ]; then
  echo "Identity '$SOURCE_IDENTITY' not found."
  echo "Create/fund it with:"
  echo "  soroban keys generate $SOURCE_IDENTITY"
  echo "  soroban keys fund $SOURCE_IDENTITY --network $NETWORK"
  exit 1
fi

if [ "$SOURCE_ADDRESS" != "$EXPECTED_ADMIN_WALLET" ]; then
  echo "Warning: source identity address does not match expected admin wallet."
  echo "  expected: $EXPECTED_ADMIN_WALLET"
  echo "  actual:   $SOURCE_ADDRESS"
fi

echo "Building WASM..."
cd "$CONTRACT_DIR"
cargo build --target wasm32v1-none --release

if [ ! -f "$WASM_FILE" ]; then
  echo "Compiled WASM not found at: $WASM_FILE"
  exit 1
fi

echo "Optimizing WASM..."
soroban contract optimize --wasm "$WASM_FILE"

if [ ! -f "$OPT_WASM_FILE" ]; then
  echo "Optimized WASM not found at: $OPT_WASM_FILE"
  exit 1
fi

echo "Deploying contract..."
CONTRACT_ID="$(
  soroban contract deploy \
    --wasm "$OPT_WASM_FILE" \
    --source "$SOURCE_IDENTITY" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$NETWORK_PASSPHRASE"
)"

if [ -z "$CONTRACT_ID" ]; then
  echo "Deployment failed: empty contract id."
  exit 1
fi

echo "Updating frontend config..."
python3 - "$FRONTEND_CONFIG" "$CONTRACT_ID" <<'PY'
import re
import sys
from pathlib import Path

config_path = Path(sys.argv[1])
contract_id = sys.argv[2]
text = config_path.read_text()
new_text, n = re.subn(
    r'export const CONTRACT_ID = ".*?";',
    f'export const CONTRACT_ID = "{contract_id}";',
    text,
    count=1,
)
if n != 1:
    raise SystemExit("Could not update CONTRACT_ID in frontend config.")
config_path.write_text(new_text)
PY

echo ""
echo "Deployment successful."
echo "Contract ID: $CONTRACT_ID"
echo "Frontend config updated: $FRONTEND_CONFIG"
