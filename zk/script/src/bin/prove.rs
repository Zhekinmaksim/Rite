//! Host: generates a Groth16 proof over a trail input and writes an EVM
//! fixture (proof bytes + public values + vkey) ready for
//! SP1RiteVerifier.submitProof.
//!
//! Usage:
//!   npx tsx scripts/export-zk-input.ts --workflow <id> --out zk/input.json
//!   cd zk/script
//!   cargo run --release --bin prove -- --input ../input.json --fixture ../fixture.json
//!
//! Requires the SP1 toolchain: curl -L https://sp1up.succinct.xyz | bash

use rite_lib::{verify_trail, TrailInput};
use clap::Parser;
use serde::Serialize;
use sp1_sdk::{include_elf, HashableKey, ProvingKey};
use sp1_sdk::blocking::{ProveRequest, Prover, ProverClient, SP1Stdin};
use std::fs;

const AUDIT_PROOF_ELF: sp1_sdk::Elf = include_elf!("rite-program");

#[derive(Parser)]
struct Args {
    /// Path to TrailInput JSON (from scripts/export-zk-input.ts)
    #[arg(long, default_value = "../input.json")]
    input: String,
    /// Where to write the EVM fixture
    #[arg(long, default_value = "../fixture.json")]
    fixture: String,
    /// Skip proving, only execute and print public values
    #[arg(long)]
    execute: bool,
}

#[derive(Serialize)]
struct EvmFixture {
    workflow_id: String,
    merkle_root: String,
    report_hash: String,
    policy_hash: String,
    vkey: String,
    public_values: String,
    proof: String,
}

fn hex32(v: &[u8; 32]) -> String {
    format!("0x{}", hex::encode(v))
}

fn main() {
    sp1_sdk::utils::setup_logger();
    let args = Args::parse();

    let raw = fs::read_to_string(&args.input).expect("read input json");
    let input: TrailInput = serde_json::from_str(&raw).expect("parse TrailInput");

    // sanity-check natively first: fail fast before spending prover time
    let expected = verify_trail(&input);
    println!("native check passed");
    println!("  merkle_root: {}", hex32(&expected.merkle_root));
    println!("  report_hash: {}", hex32(&expected.report_hash));

    let client = ProverClient::from_env();
    let mut stdin = SP1Stdin::new();
    stdin.write(&input);

    if args.execute {
        let (public_values, report) = client
            .execute(AUDIT_PROOF_ELF, stdin)
            .run()
            .expect("execution failed");
        println!("executed: {} cycles", report.total_instruction_count());
        println!("public values: 0x{}", hex::encode(public_values.as_slice()));
        return;
    }

    let pk = client.setup(AUDIT_PROOF_ELF).expect("setup failed");
    let vk = pk.verifying_key();
    let proof = client
        .prove(&pk, stdin)
        .groth16()
        .run()
        .expect("proving failed");

    client.verify(&proof, vk, None).expect("verification failed");
    println!("proof verified locally");

    let fixture = EvmFixture {
        workflow_id: hex32(&expected.workflow_id),
        merkle_root: hex32(&expected.merkle_root),
        report_hash: hex32(&expected.report_hash),
        policy_hash: hex32(&expected.policy_hash),
        vkey: vk.bytes32(),
        public_values: format!("0x{}", hex::encode(proof.public_values.as_slice())),
        proof: format!("0x{}", hex::encode(proof.bytes())),
    };

    fs::write(&args.fixture, serde_json::to_string_pretty(&fixture).unwrap())
        .expect("write fixture");
    println!("fixture written: {}", args.fixture);
}
