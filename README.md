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

### 🆕 Current Contract ID (Frontend Config)

```text id="f6d9sa"
CBN7T673P4N4QI3AO2ONDAQAX3FUUF7IAORZ6V5KJO7MKCCUB5V7ADC4
```

### 🔗 Example Reward Transaction

[https://stellar.expert/explorer/testnet/tx/4c20e27447d2562ad6a96f95e9b1189b7d6f0e5873b42a795955045ba88fdac2](https://stellar.expert/explorer/testnet/tx/4c20e27447d2562ad6a96f95e9b1189b7d6f0e5873b42a795955045ba88fdac2)
### 🔗 Contract

[https://lab.stellar.org/r/testnet/contract/CBN7T673P4N4QI3AO2ONDAQAX3FUUF7IAORZ6V5KJO7MKCCUB5V7ADC4](https://lab.stellar.org/r/testnet/contract/CBN7T673P4N4QI3AO2ONDAQAX3FUUF7IAORZ6V5KJO7MKCCUB5V7ADC4)

---

# 🚀 Current System Flow (Frontend + Backend + Soroban)

## 1) Authentication flow

1. User opens app and sees **Sign In / Sign Up** page.
2. User authenticates via:
   - Email + password (local MVP auth), or
   - Google sign-in (client-side flow).
3. After auth, user selects role:
   - **Student**
   - **Employer**

## 2) Student flow

1. Student uploads credential PDF (off-chain).
2. Frontend computes **SHA-256 hash** of the file.
3. Student submits credential record to shared storage (`/api/credentials`), including:
   - student details
   - hash
   - target employer wallet
4. Student tracks status from sidebar pages:
   - **Verification Timeline**
   - **Certificates Issued**
   - **Transaction History** (clickable StellarExpert tx links)
5. If employer assigns a task, student clicks **Finish Task** and submits accomplishment notes.

## 3) Employer flow

1. Employer sees applicants in dashboard table.
2. Employer selects hash and runs **Verify Authenticity**.
3. Employer signs credential (on-chain when function exists, with compatibility fallbacks).
4. Employer assigns task to student.
5. After student finishes task:
   - Employer issues certificate name + notes + PDF
   - Employer releases reward payment (e.g. 100 XLM)
6. Reward transaction hash is stored and becomes visible to student in certificate details and history.

## 4) Cross-browser data sync

- Credential records are stored through backend API (`http://127.0.0.1:3000/api/...`) so different browsers can see the same data.
- Frontend keeps a local fallback for MVP resilience when backend is unavailable.
- Dashboard pages auto-refresh and listen for credential update events.

## 5) Contract invocation note

Current contract exports used in the frontend integration:
- `register`
- `verify`
- `pay_reward`

The frontend Soroban utility includes compatibility attempts for different contract versions to avoid blocking the UX when function names/signatures differ.

---

# 🧠 Explanation

## 🔹 How PDF verification works

1. PDF file never goes on-chain
2. Only its **hash is stored on Soroban**
3. If hash matches → document is valid
4. If any change → hash mismatch → invalid

👉 This makes credentials **tamper-proof**

---

## 🔹 Why this solves the problem now

Instead of:

* emailing PDFs
* manual HR verification
* delayed hiring

Now with the current app flow:

* student and employer have role-specific dashboards
* credentials are shared across browsers via backend API
* issued certificate and transaction history are visible to students
* payment flow remains anchored to Stellar transactions

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
