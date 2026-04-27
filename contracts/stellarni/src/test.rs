use soroban_sdk::{
    testutils::Address as _,
    token, Address, Env,
};

use crate::{SimpleTransfer, SimpleTransferClient};

fn setup() -> (Env, SimpleTransferClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, SimpleTransfer);
    let client = SimpleTransferClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    (env, client, admin)
}

#[test]
fn test_send_success() {
    let (env, client, admin) = setup();

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    let token_id = env.register_stellar_asset_contract(admin.clone());
    let token_admin = token::AdminClient::new(&env, &token_id);

    token_admin.mint(&from, &1_000_i128);

    client.send(&token_id, &from, &to, &500_i128);

    let token_client = token::Client::new(&env, &token_id);

    assert_eq!(token_client.balance(&from), 500_i128);
    assert_eq!(token_client.balance(&to), 500_i128);
}