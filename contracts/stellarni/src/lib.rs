#![no_std]

mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, 
    Address, Env, BytesN,
    token::Client as TokenClient,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Certificate(BytesN<32>),
}

#[contract]
pub struct Stellarni;

#[contractimpl]
impl Stellarni {
    pub fn register(env: Env, user: Address, hash: BytesN<32>) {
        user.require_auth();
        env.storage().instance().set(&DataKey::Certificate(hash), &user);
    }

    pub fn verify(env: Env, hash: BytesN<32>) -> Option<Address> {
        env.storage().instance().get(&DataKey::Certificate(hash))
    }

    pub fn pay_reward(env: Env, token: Address, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let client = TokenClient::new(&env, &token);
        client.transfer(&from, &to, &amount);
    }
}
