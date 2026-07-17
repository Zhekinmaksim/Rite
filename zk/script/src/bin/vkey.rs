//! Prints the program verification key (bytes32) for SP1AuditVerifier
//! constructor / setProgramVKey.

use sp1_sdk::{include_elf, HashableKey, ProvingKey};
use sp1_sdk::blocking::{Prover, ProverClient};

const AUDIT_PROOF_ELF: sp1_sdk::Elf = include_elf!("rite-program");

fn main() {
    let client = ProverClient::from_env();
    let pk = client.setup(AUDIT_PROOF_ELF).expect("setup failed");
    println!("{}", pk.verifying_key().bytes32());
}
