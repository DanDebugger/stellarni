```rust
#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol, BytesN,
};

// -------------------------------
// Storage keys
// -------------------------------
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Certificate(BytesN<32>), // hash → owner
}

// -------------------------------
// Event symbol
// -------------------------------
const VERIFIED: Symbol = symbol_short!("VERIFIED");

// -------------------------------
// Contract
// -------------------------------
#[contract]
pub struct StellaroidEarn;

#[contractimpl]
impl StellaroidEarn {

    // Register certificate (hash → owner)
    pub fn register_certificate(env: Env, hash: BytesN<32>, owner: Address) {
        owner.require_auth();

        // Prevent duplicate certificate
        if env.storage().has(&DataKey::Certificate(hash.clone())) {
            panic!("Certificate already exists");
        }

        // Store certificate ownership
        env.storage().set(&DataKey::Certificate(hash), &owner);
    }

    // Reward student after verification
    pub fn reward_student(
        env: Env,
        token: Address,
        admin: Address,
        student: Address,
        amount: i128,
    ) {
        admin.require_auth();

        let client = soroban_sdk::token::Client::new(&env, &token);

        // Transfer reward (XLM or token)
        client.transfer(&admin, &student, &amount);
    }

    // Verify certificate (returns bool + emits event)
    pub fn verify_certificate(env: Env, hash: BytesN<32>, user: Address) -> bool {
        let stored: Option<Address> =
            env.storage().get(&DataKey::Certificate(hash.clone()));

        match stored {
            Some(owner) => {
                let valid = owner == user;

                // Emit event for frontend indexing
                env.events().publish((VERIFIED, hash), valid);

                valid
            }
            None => false,
        }
    }

    // Employer payment to verified student
    pub fn link_payment(
        env: Env,
        token: Address,
        employer: Address,
        student: Address,
        amount: i128,
    ) {
        employer.require_auth();

        let client = soroban_sdk::token::Client::new(&env, &token);

        // Direct payment
        client.transfer(&employer, &student, &amount);
    }
}

