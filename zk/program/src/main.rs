//! SP1 guest program: verifies a Rite trail and commits public values.
//!
//! Private input: the full TrailInput (step preimages, task, policy, report).
//! Public output: abi.encode(workflowId, merkleRoot, reportHash, policyHash),
//! matching what SP1RiteVerifier.sol decodes onchain.
//!
//! Any tampering (removed, reordered, or swapped steps; forged input/output
//! chaining; mismatched report) panics inside the zkVM, so no valid proof
//! can exist for a broken trail.

#![no_main]
sp1_zkvm::entrypoint!(main);

use rite_lib::{verify_trail, TrailInput};

pub fn main() {
    let input: TrailInput = sp1_zkvm::io::read();
    let outputs = verify_trail(&input);
    sp1_zkvm::io::commit_slice(&outputs.abi_encode());
}
