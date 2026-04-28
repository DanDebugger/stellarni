#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    Address, Env, BytesN,
};

use crate::{Stellarni, StellarniClient};

#[test]
fn test_register_and_sign_certificate() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, Stellarni);
    let client = StellarniClient::new(&env, &contract_id);

    let student = Address::generate(&env);
    let employer = Address::generate(&env);
    let institution = Address::generate(&env);
    let hash = BytesN::from_array(&env, &[1; 32]);

    // 1. Register
    client.register_certificate(&hash, &student, &employer, &institution);

    // 2. Verify state
    let cert = client.get_certificate(&hash).unwrap();
    assert_eq!(cert.student, student);
    assert_eq!(cert.employer_signed, false);

    // 3. Employer signs
    client.sign_certificate(&hash, &employer);
    
    let cert_after = client.get_certificate(&hash).unwrap();
    assert_eq!(cert_after.employer_signed, true);
    assert_eq!(cert_after.institution_signed, false);

    // 4. Institution signs
    client.sign_certificate(&hash, &institution);
    let cert_final = client.get_certificate(&hash).unwrap();
    assert_eq!(cert_final.institution_signed, true);
}

#[test]
#[should_panic]
fn test_not_authorized_sign() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, Stellarni);
    let client = StellarniClient::new(&env, &contract_id);

    let student = Address::generate(&env);
    let employer = Address::generate(&env);
    let institution = Address::generate(&env);
    let hacker = Address::generate(&env);
    let hash = BytesN::from_array(&env, &[2; 32]);

    client.register_certificate(&hash, &student, &employer, &institution);

    // hacker tries to sign
    client.sign_certificate(&hash, &hacker);
}