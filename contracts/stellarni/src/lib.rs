#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    symbol_short, Address, Env, BytesN,
    token::Client as TokenClient,
    panic_with_error,
};

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    CertificateAlreadyExists = 1,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Certificate(BytesN<32>),
}

#[contract]
pub struct StellaroidEarn;

#[contractimpl]
impl StellaroidEarn {

    pub fn register_certificate(env: Env, hash: BytesN<32>, owner: Address) {
        owner.require_auth();

        if env.storage().instance().has(&DataKey::Certificate(hash.clone())) {
            panic_with_error!(&env, ContractError::CertificateAlreadyExists);
        }

        env.storage()
            .instance()
            .set(&DataKey::Certificate(hash), &owner);
    }

    pub fn reward_student(
        env: Env,
        token: Address,
        admin: Address,
        student: Address,
        amount: i128,
    ) {
        admin.require_auth();
        let client = TokenClient::new(&env, &token);
        client.transfer(&admin, &student, &amount);
    }

    pub fn verify_certificate(env: Env, hash: BytesN<32>, user: Address) -> bool {
        let stored: Option<Address> =
            env.storage().instance().get(&DataKey::Certificate(hash.clone()));

        match stored {
            Some(owner) => {
                let valid = owner == user;
                env.events().publish(
                    (symbol_short!("verified"), hash),
                    valid,
                );
                valid
            }
            None => false,
        }
    }

    pub fn link_payment(
        env: Env,
        token: Address,
        employer: Address,
        student: Address,
        amount: i128,
    ) {
        employer.require_auth();
        let client = TokenClient::new(&env, &token);
        client.transfer(&employer, &student, &amount);
    }
}