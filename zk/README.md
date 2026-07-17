# zk module: SP1 proof over the agent trail

Proves in zero knowledge that a committed audit trail is intact:

- every step hash is recomputed from the current production preimage:
  `inputHash || outputHash || keccak(role) || uint64(timestamp) || policyHash`
- the Rust implementation is byte-identical to `lib/hashing.ts` and
  `lib/merkle.ts`, checked by `zk/testdata/vector.json`
- steps are chained: `input_hash[i] == output_hash[i-1]`
- step 0 consumes the task hash
- roles follow policy: `researcher -> critic -> finalizer`
- timestamps strictly increase
- every step uses the same policy hash
- sorted-pair keccak Merkle root covers exactly these steps
- final report matches the final step output

Public values: abi.encode(workflowId, merkleRoot, reportHash, policyHash).

## Layout

    lib/        rite-lib: hashing + verification core (tested here)
    program/    SP1 guest (no_main, sp1-zkvm entrypoint)
    script/     host: prove (Groth16 fixture) and vkey binaries
    contracts/  SP1RiteVerifier.sol: verifies proof, checks public values
                against the anchored workflow, calls markProofVerified
    testdata/   vector.json generated from the TypeScript runner

## Cross-check tests (no SP1 toolchain needed)

    npx tsx scripts/export-zk-input.ts --vector zk/testdata/vector.json
    cd zk && cargo test -p rite-lib

Asserts Rust hashes are byte-identical to lib/hashing.ts + lib/merkle.ts,
and that tampered or reordered trails panic (= unprovable).

## Proving (requires SP1 toolchain)

    curl -L https://sp1up.succinct.xyz | bash && sp1up

    # export a real workflow as prover input
    npx tsx scripts/export-zk-input.ts --workflow <workflowId> --out zk/input.json

    cd zk/script
    cargo run --release --bin prove -- --execute            # dry run, cycle count
    cargo run --release --bin prove                         # Groth16, writes ../fixture.json
    cargo run --release --bin vkey                          # bytes32 for the verifier

## Onchain

1. Deploy the canonical SP1 verifier gateway (sp1-contracts) or use an
   existing deployment on the target chain.
2. Deploy SP1RiteVerifier(verifierGateway, rite, vkey).
3. Rite.setProofAuthority(sp1AuditVerifier).
4. submitProof(publicValues, proof) from fixture.json; on success the
   workflow's proofVerified flips to true.

## Ritual-native alternative (v3)

Instead of the SP1 gateway, request the proof through Ritual ZK precompile
0x0806; the TEE prover delivers the result via AsyncDelivery
(0x5A16214fF555848411544b005f7Ac063742f39F6) into an onZKResultDelivered
callback, which then calls markProofVerified. Same public values layout.
