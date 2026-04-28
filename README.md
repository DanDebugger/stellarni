# Stellarni 💸🎓

**On-chain Credential Verification + PDF Document Signing + Payments (Soroban / Stellar)**

Stellaroid Earn is a Soroban smart contract system that allows students to register academic credentials, upload and verify document hashes (PDF certificates/contracts), and enable secure signing and payments between students and employers on the Stellar network.

---

# 🧩 Problem

A graduating student in the Philippines cannot easily prove their credentials to employers or access financial opportunities, forcing them to rely on manual verification that delays hiring and limits income.
📊 Impact Data (REAL-WORLD CONTEXT):
🎓 The Philippines produces ~500,000+ college graduates per year, but many struggle to transition into formal employment due to verification and hiring delays (CHED reports / labor statistics trends)
⏳ Entry-level hiring in the Philippines often takes 1–3 weeks due to manual background and credential checks (HR outsourcing and BPO hiring practices)
📄 Employers report high cases of unverifiable or incomplete academic records, especially for first-job applicants
💸 A delay of even 2 weeks in hiring can equal ~10–25% of monthly income loss for entry-level workers (₱10,000–₱25,000/month range)
🏢 Many SMEs still rely on manual document checking (email, school verification calls, paper submissions)


---

# 💡 Solution

Stellaroid Earn stores **PDF document hashes on-chain**, allowing students, schools, and employers to **verify, sign, and validate credentials instantly**, and triggers secure XLM/token payments once verification is complete.

---

# 📁 Project Overview

This system enables:

* 📄 PDF/document hashing (off-chain → on-chain proof)
* 🎓 Certificate registration linked to wallet identity
* ✍️ Multi-party document signing (student, employer, institution)
* 🔍 Instant verification on-chain
* 💸 Automated reward and payment flows using Stellar tokens

---

# ⚙️ Setup

## 1. Install Requirements

```bash id="a1k8sd"
cargo install stellar-cli
rustup target add wasm32v1-none
```

---

## 2. Build Contract

```bash id="b2m9kl"
cargo build --target wasm32v1-none --release
```

Output:

```text id="c3z1aa"
target/wasm32v1-none/release/stellarni.wasm
```

---

## 3. Configure Network

```bash id="d4c2ld"
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

---

## 4. Deploy Contract

```bash id="e5p3km"
stellar contract deploy \
  --wasm /app/target/wasm32v1-none/release/stellarni.wasm \
  --source stellar-ide-default \
  --network testnet \
  --alias 1cdd1acc-stellarni \
  --salt 3c113862eb5388c78824ab73712d52edcc75bbb4635de316857d059f40d8f138
```

---

# 📌 Deployment Result

### 🆕 Latest Contract ID

```text id="f6d9sa"
CCVWUQ5QRQFN7FMFZ3NZLLRODLVQ24C6XYCXBIWQP2TCVORMCBYRPBXM
```

### 🔗 Transaction

[https://stellar.expert/explorer/testnet/tx/9743253570088960#9743253570088961]
### 🔗 Contract

[ttps://lab.stellar.org/r/testnet/contract/CDMIMOLX3D5XATS4K4V6UZTNZW4GU7SFGC4ZZE73ZJJ3SYHDM3D4TUX4]
---

# 🚀 Core Usage Flow (PDF Credential System)

## 🔹 Step 1: Student uploads PDF (off-chain)

* PDF is hashed (SHA-256)
* Hash is sent to contract

## 🔹 Step 2: Register Credential

```bash id="g7v1qa"
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <STUDENT> \
  --network testnet \
  -- register_certificate \
  --hash <PDF_HASH> \
  --owner <STUDENT_ADDRESS>
```

---

## 🔹 Step 3: Employer verifies credential

```bash id="h8v2qa"
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <EMPLOYER> \
  --network testnet \
  -- verify_certificate \
  --hash <PDF_HASH> \
  --user <STUDENT_ADDRESS>
```

---

## 🔹 Step 4: Multi-party signing (PDF contract flow)

* Student signs document
* Employer signs document
* Institution optionally signs

---

## 🔹 Step 5: Payment triggered

```bash id="i9v3qa"
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <EMPLOYER> \
  --network testnet \
  -- link_payment \
  --token <TOKEN_ID> \
  --employer <EMPLOYER_ADDRESS> \
  --student <STUDENT_ADDRESS> \
  --amount 500
```

---

# 🧠 Explanation

## 🔹 How PDF verification works

1. PDF file never goes on-chain
2. Only its **hash is stored on Soroban**
3. If hash matches → document is valid
4. If any change → hash mismatch → invalid

👉 This makes credentials **tamper-proof**

---

## 🔹 Why this solves the problem

Instead of:

* emailing PDFs
* manual HR verification
* delayed hiring

Now:

* instant verification
* trustless proof
* automatic payment flow

---

# 🔐 Security Notes

* Requires wallet authorization (`require_auth`)
* PDF is never stored on-chain (only hash)
* Prevents duplicate credential registration
* Verification is deterministic (no human needed)

---

# 📌 Summary

Stellaroid Earn is:

* 🎓 Credential verification system
* 📄 PDF hash-based document proof layer
* ✍️ Multi-signature agreement flow
* 💸 Payment automation system on Stellar

---

# 🚀 Future Improvements

* IPFS PDF storage integration
* Real-time employer dashboard
* Signature expiration / revocation
* On-chain credential NFT representation
* Mobile-first verification app
