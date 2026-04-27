#![no_std]

use soroban_sdk::{contract, contractimpl, token, Address, Env};

#[contract]
pub struct SimpleTransfer;

#[contractimpl]
impl SimpleTransfer {
    pub fn send(
        env: Env,
        token: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        from.require_auth();

        let client = token::Client::new(&env, &token);

        // safer explicit transfer
        client.transfer(&from, &to, &amount);

        
    }
}