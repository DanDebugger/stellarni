#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    Address, Env, BytesN,
};

use crate::{StellaroidEarn, StellaroidEarnClient};

// -------------------------------------
// Test 1: Register certificate success
// -------------------------------------
#[test]
fn test_register_certificate_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, StellaroidEarn);
    let client = StellaroidEarnClient::new(&env, &contract_id);

    let student = Address::generate(&env);
    let hash = BytesN::from_array(&env, &[1; 32]);

    client.register_certificate(&hash, &student);

    assert_eq!(client.verify_certificate(&hash, &student), true);
}

// -------------------------------------
// Test 2: Duplicate certificate (panic)
// -------------------------------------
#[test]
#[should_panic]
fn test_duplicate_certificate() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, StellaroidEarn);
    let client = StellaroidEarnClient::new(&env, &contract_id);

    let student = Address::generate(&env);
    let hash = BytesN::from_array(&env, &[2; 32]);

    client.register_certificate(&hash, &student);

    // duplicate should fail
    client.register_certificate(&hash, &student);
}

// -------------------------------------
// Test 3: State verification
// -------------------------------------
#[test]
fn test_certificate_verification_state() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, StellaroidEarn);
    let client = StellaroidEarnClient::new(&env, &contract_id);

    let student = Address::generate(&env);
    let hash = BytesN::from_array(&env, &[3; 32]);

    client.register_certificate(&hash, &student);

    assert!(client.verify_certificate(&hash, &student));
}