#![no_std]

use soroban_sdk::{contract, contractimpl, token, Address, Env};

#[contract]
pub struct SimpleTransfer;

#[contractimpl]
impl SimpleTransfer {
    /// Transfer tokens from `from` to `to`
    pub fn send(
        env: Env,
        token: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        // Require authorization from sender
        from.require_auth();

        let client = token::Client::new(&env, &token);
        client.transfer(&from, &to, &amount);
    }
}