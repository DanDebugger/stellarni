use soroban_sdk::{
    testutils::Address as _,
    token, Address, Env,
};

use crate::{SimpleTransfer, SimpleTransferClient};

/// Setup helper
fn setup() -> (Env, SimpleTransferClient<'static>, Address) {
    let env = Env::default();

    // IMPORTANT: enables auth simulation
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SimpleTransfer);
    let client = SimpleTransferClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    (env, client, admin)
}

//
// ── Test 1: Happy Path ─────────────────────────────────────────────
//
#[test]
fn test_send_success() {
    let (env, client, admin) = setup();

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    // Create mock token
    let token_id = env.register_stellar_asset_contract(admin.clone());
    let token_admin = token::AdminClient::new(&env, &token_id);

    // Mint tokens to sender
    token_admin.mint(&from, &1_000_i128);

    // Execute transfer
    client.send(&token_id, &from, &to, &500_i128);

    let token_client = token::Client::new(&env, &token_id);

    assert_eq!(token_client.balance(&from), 500_i128);
    assert_eq!(token_client.balance(&to), 500_i128);
}

//
// ── Test 2: Insufficient balance ───────────────────────────────────
//
#[test]
#[should_panic]
fn test_send_insufficient_balance_should_fail() {
    let (env, client, admin) = setup();

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    let token_id = env.register_stellar_asset_contract(admin.clone());

    // No mint → balance = 0

    client.send(&token_id, &from, &to, &500_i128);
}

//
// ── Test 3: Zero amount ────────────────────────────────────────────
//
#[test]
fn test_send_zero_amount() {
    let (env, client, admin) = setup();

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    let token_id = env.register_stellar_asset_contract(admin.clone());
    let token_admin = token::AdminClient::new(&env, &token_id);

    token_admin.mint(&from, &1_000_i128);

    // Transfer 0 (allowed by your contract)
    client.send(&token_id, &from, &to, &0_i128);

    let token_client = token::Client::new(&env, &token_id);

    assert_eq!(token_client.balance(&from), 1_000_i128);
    assert_eq!(token_client.balance(&to), 0_i128);
}

//
// ── Test 4: Multiple transfers ─────────────────────────────────────
//
#[test]
fn test_multiple_transfers() {
    let (env, client, admin) = setup();

    let from = Address::generate(&env);
    let to1 = Address::generate(&env);
    let to2 = Address::generate(&env);

    let token_id = env.register_stellar_asset_contract(admin.clone());
    let token_admin = token::AdminClient::new(&env, &token_id);

    token_admin.mint(&from, &1_000_i128);

    client.send(&token_id, &from, &to1, &300_i128);
    client.send(&token_id, &from, &to2, &200_i128);

    let token_client = token::Client::new(&env, &token_id);

    assert_eq!(token_client.balance(&from), 500_i128);
    assert_eq!(token_client.balance(&to1), 300_i128);
    assert_eq!(token_client.balance(&to2), 200_i128);
}