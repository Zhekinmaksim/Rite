Shipping Rite — verifiable AI audit trails on Ritual Chain.

AI-assisted smart contract audits are becoming a real workflow, but most tools still give you only a report. A report does not prove which steps happened, in what order, or whether anything was swapped after the fact.

Rite makes the workflow itself verifiable.

Three agents review a Solidity contract:

- a researcher maps the issues
- a critic challenges the pass
- a finalizer signs the assessment

Each step is hashed with its full audit context: input hash, output hash, role, timestamp and policy hash. The steps are chained, so step N must consume the exact output of step N-1.

Those step hashes form a Merkle tree. The root and final report hash are committed to the Rite contract on Ritual Chain by the user's own wallet. No server signer.

After that, anyone can open the record and check:

- committed by `0x...`
- tx hash and block
- whether a step belongs to the committed root
- whether a tampered step fails verification

The ZK layer ships in the repo. An SP1 guest replays the full trail inside the zkVM: recomputes every hash, checks role order, checks chaining, checks timestamps, rebuilds the Merkle root, and commits `workflowId`, `merkleRoot`, `reportHash` and `policyHash`.

Tamper with the trail and the guest panics. In a zkVM, that means no valid proof can exist.

This is not a claim that the model “thought correctly.” It proves something narrower and more useful for audit infrastructure: these agents, in this order, with these inputs and outputs, produced exactly this report, and the trail was not changed afterwards.

Today the live app demonstrates deterministic audit records, wallet commits on Ritual, public receipts, Merkle step verification and tamper checks.

Next: moving execution closer to Ritual-native rails — LLM inference, sovereign agents, and proof delivery through the ZK precompile / async callback path.

Every workflow is a rite: performed in order, witnessed, sealed.

[userite.xyz](https://userite.xyz)

[github.com/Zhekinmaksim/Rite](https://github.com/Zhekinmaksim/Rite)
