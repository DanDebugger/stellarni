```rust
#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    Address, Env, BytesN, Vec,
};

use crate::{StellaroidEarn, StellaroidEarnClient};

// -------------------------------------
// Test 1: Happy path (document signing)
// -------------------------------------
#[test]
fn test_document_signing_flow() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy contract
    let contract_id = env.register_contract(None, StellaroidEarn);
    let client = StellaroidEarnClient::new(&env, &contract_id);

    // Create actors
    let student = Address::generate(&env);
    let employer = Address::generate(&env);

    // Create document hash
    let hash = BytesN::from_array(&env, &[1; 32]);

    // Define required signers
    let mut signers = Vec::new(&env);
    signers.push_back(student.clone());
    signers.push_back(employer.clone());

    // Create document
    client.create_document(&hash, &signers);

    // Both parties sign
    client.sign_document(&hash, &student);
    client.sign_document(&hash, &employer);

    // Assert fully signed
    assert_eq!(client.is_fully_signed(&hash), true);
}

// -------------------------------------
// Test 2: Unauthorized signer (edge case)
// -------------------------------------
#[test]
#[should_panic]
fn test_unauthorized_signer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, StellaroidEarn);
    let client = StellaroidEarnClient::new(&env, &contract_id);

    let student = Address::generate(&env);
    let fake = Address::generate(&env);

    let hash = BytesN::from_array(&env, &[2; 32]);

    // Only student is allowed signer
    let mut signers = Vec::new(&env);
    signers.push_back(student.clone());

    client.create_document(&hash, &signers);

    // Fake signer tries to sign → should panic
    client.sign_document(&hash, &fake);
}

// -------------------------------------
// Test 3: Full flow validation
// -------------------------------------
#[test]
fn test_full_flow_payment_after_sign() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, StellaroidEarn);
    let client = StellaroidEarnClient::new(&env, &contract_id);

    let student = Address::generate(&env);
    let employer = Address::generate(&env);

    let hash = BytesN::from_array(&env, &[3; 32]);

    let mut signers = Vec::new(&env);
    signers.push_back(student.clone());
    signers.push_back(employer.clone());

    client.create_document(&hash, &signers);

    client.sign_document(&hash, &student);
    client.sign_document(&hash, &employer);

    // Validate final state
    assert!(client.is_fully_signed(&hash));
}

