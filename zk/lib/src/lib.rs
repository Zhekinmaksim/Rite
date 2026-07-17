//! Core verification logic shared between the SP1 guest program and tests.
//!
//! Reimplements the production hashing scheme from `lib/hashing.ts` and
//! `lib/merkle.ts` (scheme id: step.v1):
//!
//! stepHash = keccak256(
//!   inputHash || outputHash || keccak256(role) || uint64(timestamp) ||
//!   policyHash
//! )
//!
//! Merkle: commutative (sorted-pair) keccak256, odd node promoted unchanged.
//! Compatible with OpenZeppelin MerkleProof.

use serde::{Deserialize, Serialize};
use tiny_keccak::{Hasher, Keccak};

pub type Hash32 = [u8; 32];

pub const REQUIRED_ROLES: [&str; 3] = ["researcher", "critic", "finalizer"];

/// One agent step. Hashes of input/output are private witness data, but the
/// verifier cross-checks the chain: input_hash[i] must equal output_hash[i-1],
/// input_hash[0] must equal keccak(task), output_hash[last] must equal
/// keccak(final_report), and policy_hash must equal keccak(policy).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StepInput {
    pub role: String,
    #[serde(with = "hex_hash")]
    pub input_hash: Hash32,
    #[serde(with = "hex_hash")]
    pub output_hash: Hash32,
    #[serde(with = "hex_hash")]
    pub policy_hash: Hash32,
    pub timestamp: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TrailInput {
    #[serde(with = "hex_hash")]
    pub workflow_id: Hash32,
    pub task: String,
    pub policy: String,
    pub final_report: String,
    pub steps: Vec<StepInput>,
}

/// Public values committed by the guest. ABI layout: 4 static bytes32 words,
/// so `abi.encode(a,b,c,d)` == plain concatenation. Solidity decodes with
/// `abi.decode(publicValues, (bytes32, bytes32, bytes32, bytes32))`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PublicOutputs {
    pub workflow_id: Hash32,
    pub merkle_root: Hash32,
    pub report_hash: Hash32,
    pub policy_hash: Hash32,
}

impl PublicOutputs {
    pub fn abi_encode(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(128);
        out.extend_from_slice(&self.workflow_id);
        out.extend_from_slice(&self.merkle_root);
        out.extend_from_slice(&self.report_hash);
        out.extend_from_slice(&self.policy_hash);
        out
    }
}

pub fn keccak256(data: &[u8]) -> Hash32 {
    let mut hasher = Keccak::v256();
    let mut out = [0u8; 32];
    hasher.update(data);
    hasher.finalize(&mut out);
    out
}

/// keccak over utf-8 bytes; equals hashText() in lib/hashing.ts.
pub fn hash_text(text: &str) -> Hash32 {
    keccak256(text.as_bytes())
}

pub fn compute_step_hash(step: &StepInput) -> Hash32 {
    let mut buf = Vec::with_capacity(136);
    buf.extend_from_slice(&step.input_hash);
    buf.extend_from_slice(&step.output_hash);
    buf.extend_from_slice(&hash_text(&step.role));
    buf.extend_from_slice(&step.timestamp.to_be_bytes());
    buf.extend_from_slice(&step.policy_hash);
    keccak256(&buf)
}

fn hash_pair(a: &Hash32, b: &Hash32) -> Hash32 {
    let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
    let mut buf = [0u8; 64];
    buf[..32].copy_from_slice(lo);
    buf[32..].copy_from_slice(hi);
    keccak256(&buf)
}

pub fn merkle_root(leaves: &[Hash32]) -> Hash32 {
    assert!(!leaves.is_empty(), "no leaves");
    let mut layer: Vec<Hash32> = leaves.to_vec();
    while layer.len() > 1 {
        let mut next = Vec::with_capacity((layer.len() + 1) / 2);
        let mut i = 0;
        while i < layer.len() {
            if i + 1 < layer.len() {
                next.push(hash_pair(&layer[i], &layer[i + 1]));
            } else {
                next.push(layer[i]); // odd node promoted (OZ-compatible)
            }
            i += 2;
        }
        layer = next;
    }
    layer[0]
}

/// Full trail verification. Panics on any violation; in the SP1 guest a
/// panic means no proof can be produced for a tampered trail.
pub fn verify_trail(input: &TrailInput) -> PublicOutputs {
    let steps = &input.steps;
    assert_eq!(steps.len(), 3, "policy v1 requires exactly 3 steps");

    // policy v1: researcher -> critic -> finalizer.
    for (i, role) in REQUIRED_ROLES.iter().enumerate() {
        assert_eq!(&steps[i].role, role, "role order violated at step {i}");
    }

    let policy_hash = hash_text(&input.policy);

    // step 0 consumes the task itself
    assert_eq!(
        steps[0].input_hash,
        hash_text(&input.task),
        "step 0 input must hash the task"
    );

    let mut last_ts: u64 = 0;
    let mut leaves: Vec<Hash32> = Vec::with_capacity(steps.len());

    for (i, step) in steps.iter().enumerate() {
        assert_eq!(step.policy_hash, policy_hash, "step {i} policy hash mismatch");
        // agents are chained: each step consumes the previous output
        if i > 0 {
            assert_eq!(
                step.input_hash,
                steps[i - 1].output_hash,
                "step {i} input must equal step {} output",
                i - 1
            );
            assert!(step.timestamp > last_ts, "timestamps must strictly increase");
        }
        last_ts = step.timestamp;

        let h = compute_step_hash(step);
        leaves.push(h);
    }

    // the final report is exactly the last agent's output
    let report_hash = hash_text(&input.final_report);
    assert_eq!(
        report_hash,
        steps.last().unwrap().output_hash,
        "final report must match last step output"
    );

    PublicOutputs {
        workflow_id: input.workflow_id,
        merkle_root: merkle_root(&leaves),
        report_hash,
        policy_hash,
    }
}

mod hex_hash {
    use super::Hash32;
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S: Serializer>(v: &Hash32, s: S) -> Result<S::Ok, S::Error> {
        let mut out = String::with_capacity(66);
        out.push_str("0x");
        for b in v {
            out.push_str(&format!("{b:02x}"));
        }
        s.serialize_str(&out)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<Hash32, D::Error> {
        let s = String::deserialize(d)?;
        let s = s.strip_prefix("0x").unwrap_or(&s);
        if s.len() != 64 {
            return Err(serde::de::Error::custom("expected 32-byte hex"));
        }
        let mut out = [0u8; 32];
        for i in 0..32 {
            out[i] = u8::from_str_radix(&s[i * 2..i * 2 + 2], 16)
                .map_err(serde::de::Error::custom)?;
        }
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Cross-check against a vector generated by the TypeScript runner
    /// (scripts/export-zk-input.ts --with-expected). Guarantees the Rust
    /// guest computes byte-identical hashes to lib/hashing.ts + lib/merkle.ts.
    #[test]
    fn matches_typescript_vector() {
        let raw = fs::read_to_string("../testdata/vector.json")
            .expect("run: npx tsx scripts/export-zk-input.ts --vector zk/testdata/vector.json");
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();

        let input: TrailInput =
            serde_json::from_value(v["input"].clone()).unwrap();
        let out = verify_trail(&input);

        let expect = |k: &str| -> Hash32 {
            let s = v["expected"][k].as_str().unwrap();
            let bytes = hex::decode(s.strip_prefix("0x").unwrap()).unwrap();
            bytes.try_into().unwrap()
        };

        assert_eq!(out.merkle_root, expect("merkleRoot"), "merkle root mismatch");
        assert_eq!(out.report_hash, expect("reportHash"), "report hash mismatch");
        assert_eq!(out.policy_hash, expect("policyHash"), "policy hash mismatch");
        assert_eq!(out.workflow_id, expect("workflowId"));

        // per-step hashes
        let expected_steps = v["expected"]["stepHashes"].as_array().unwrap();
        for (i, step) in input.steps.iter().enumerate() {
            let h = compute_step_hash(step);
            let e = hex::decode(
                expected_steps[i].as_str().unwrap().strip_prefix("0x").unwrap(),
            )
            .unwrap();
            assert_eq!(h.as_slice(), e.as_slice(), "step {i} hash mismatch");
        }
    }

    #[test]
    #[should_panic(expected = "input must equal")]
    fn rejects_tampered_step() {
        let raw = fs::read_to_string("../testdata/vector.json").unwrap();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        let mut input: TrailInput =
            serde_json::from_value(v["input"].clone()).unwrap();
        input.steps[1].input_hash = [0xab; 32]; // swap in a forged input
        verify_trail(&input);
    }

    #[test]
    #[should_panic(expected = "role order")]
    fn rejects_reordered_roles() {
        let raw = fs::read_to_string("../testdata/vector.json").unwrap();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        let mut input: TrailInput =
            serde_json::from_value(v["input"].clone()).unwrap();
        input.steps.swap(0, 1);
        verify_trail(&input);
    }
}
