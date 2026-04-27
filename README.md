# Stellarni 💸

**Simple Wallet & Fund Transfer (Soroban Smart Contract)**

Stellarni is a lightweight Soroban smart contract that enables secure token transfers between accounts on the Stellar network. It acts as a minimal “wallet transfer layer” by leveraging Stellar’s native token contracts.

---

# 📁 Project Overview

This contract implements a **simple transfer mechanism**:

* Uses Soroban SDK
* Interacts with Stellar Asset Contracts (SAC)
* Requires sender authorization
* Executes safe token transfers

---

# ⚙️ Setup

## 1. Install Requirements

```bash id="t9n7s2"
cargo install stellar-cli
rustup target add wasm32v1-none
```

---

## 2. Build Contract

From your project root:

```bash id="d9g3ls"
cargo build --target wasm32v1-none --release
```

Output:

```id="xk92hs"
target/wasm32v1-none/release/stellarni.wasm
```

---

## 3. Configure Network

```bash id="b3t2zn"
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

---

## 4. Deploy Contract

```bash id="x7a1kp"
stellar contract deploy \
  --wasm /app/target/wasm32v1-none/release/stellarni.wasm \
  --source stellar-ide-default \
  --network testnet \
  --alias 1cdd1acc-stellarni \
  --salt 3c113862eb5388c78824ab73712d52edcc75bbb4635de316857d059f40d8f138
```

---

## 📌 Deployment Result

* **Contract ID**

```id="c2p7qs"
CCVNZYVL3N64LJLYZ6DXIUDYGNW4EBYRJZ2XAMGL4QK5EW6FM3LTVCEK
```

* **Transaction Explorer**
  https://stellar.expert/explorer/testnet/tx/91fa8daeae45b67f9d9af2e485041ab78adf21ce2f31a8ebac2adb642f1b0b26

* **Contract UI**
  https://lab.stellar.org/r/testnet/contract/CCVNZYVL3N64LJLYZ6DXIUDYGNW4EBYRJZ2XAMGL4QK5EW6FM3LTVCEK

---

# 🚀 Usage

## 🔹 Send Tokens

```bash id="yq8z1m"
stellar contract invoke \
  --id CCVNZYVL3N64LJLYZ6DXIUDYGNW4EBYRJZ2XAMGL4QK5EW6FM3LTVCEK \
  --source <SENDER_ACCOUNT> \
  --network testnet \
  -- send \
  --token <TOKEN_CONTRACT_ID> \
  --from <SENDER_ADDRESS> \
  --to <RECIPIENT_ADDRESS> \
  --amount 500
```

---

# 🧠 Explanation

## 🔹 Contract Logic

```rust id="4v3k2s"
pub fn send(env: Env, token: Address, from: Address, to: Address, amount: i128)
```

### What happens step-by-step:

1. **Authorization Check**

```rust id="bq8kz1"
from.require_auth();
```

* Ensures only the sender can approve the transfer
* Prevents unauthorized fund movement

---

2. **Token Client Creation**

```rust id="8sj2na"
let client = token::Client::new(&env, &token);
```

* Connects to a Stellar token contract
* Allows interaction with balances

---

3. **Transfer Execution**

```rust id="z91wqe"
client.transfer(&from, &to, &amount);
```

* Moves tokens from sender → receiver
* Uses built-in safe transfer logic

---

## 🔹 Key Concept

👉 This contract does **NOT store balances**

Instead:

* It uses existing **Stellar token contracts**
* Acts as a **secure transfer proxy**
* Keeps logic minimal and efficient

---

# 🧪 Testing

Run tests:

```bash id="4o3znb"
cargo test
```

---

## 🔹 Test Explanation

### Setup

```rust id="8k1xpw"
env.mock_all_auths();
```

* Simulates authentication (no real signatures needed)

---

### Token Creation

```rust id="g3y8lm"
let token_id = env.register_stellar_asset_contract(admin.clone());
```

* Creates a test token contract

---

### Minting

```rust id="k8z3np"
token_admin.mint(&from, &1_000_i128);
```

* Gives sender initial balance

---

### Transfer Execution

```rust id="n2x7ka"
client.send(&token_id, &from, &to, &500_i128);
```

---

### Assertions

```rust id="f1p9ql"
assert_eq!(token_client.balance(&from), 500_i128);
assert_eq!(token_client.balance(&to), 500_i128);
```

✔ Confirms transfer worked correctly

---

# 🔐 Security Notes

* ✅ Requires sender authorization (`require_auth`)
* ✅ Uses trusted Stellar token contract
* ⚠️ Does not validate:

  * Negative amounts
  * Same sender/receiver
* ⚠️ No event logging yet

---

# 📌 Summary

Stellarni is:

* A **minimal Soroban transfer contract**
* A **wrapper around Stellar token transfers**
* A foundation for:

  * Wallet apps
  * Payment systems
  * DeFi primitives

---

# 🚀 Possible Improvements

* Add transfer event logs
* Validate inputs (amount > 0)
* Add fee mechanism
* Build frontend wallet UI
* Support multi-token batching

---

# 📄 License

MIT
