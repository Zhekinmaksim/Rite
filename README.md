# Rite

Rite is a proof trail for AI-assisted smart contract audits.

AI audit tools are becoming useful, but most of them still end with a report. A report does not show which steps happened, in what order, or whether someone swapped a finding after the fact. Rite records the workflow itself.

The current demo runs a deterministic three-step review:

1. `researcher` maps the high-signal issues.
2. `critic` challenges the initial pass.
3. `finalizer` signs the final assessment.

Each step commits to its input hash, output hash, role, timestamp and policy hash. The step hashes form an OpenZeppelin-compatible sorted-pair Merkle tree. The user signs the root with their own wallet and anchors it in the Rite contract on Ritual Chain.

From that point anyone can open the workflow link and check:

- who committed it;
- which transaction sealed it;
- whether a specific step belongs to the committed Merkle root;
- whether a tampered step fails verification.

The live app is at [userite.xyz](https://userite.xyz).

![Rite workflow schematic](public/rite-schematic.svg)

## What is live now

- Next.js frontend for creating audit records and browsing receipts.
- API routes for workflow creation, listing, reading and step verification.
- Wallet-based onchain commit. No server private key is used.
- Ritual Chain configuration, using `https://rpc.ritualfoundation.org`.
- Stored onchain receipt metadata: signer, tx hash, chain id, status and block number.
- “My records” filtering by connected wallet.
- Tamper demo on the step verification page.
- Explorer links for signer addresses and commit transactions.
- Durable workflow storage on Vercel through Upstash Redis, with local filesystem fallback for development.

## Contract

[`contracts/Rite.sol`](contracts/Rite.sol) stores the workflow commitment:

- `workflowId`
- `taskHash`
- `merkleRoot`
- `reportHash`
- `policyHash`
- `creator`
- optional proof-verified status for the SP1 verifier path

`verifyStep` uses OpenZeppelin Merkle proof verification against the committed root. The app sends `submitWorkflow` from the connected browser wallet.

## ZK / SP1 proof layer

The repository includes an SP1 proof module in [`zk/`](zk):

- `zk/lib` reimplements the production TypeScript hashing and Merkle logic in Rust.
- `zk/program` is the SP1 guest. It replays the full trail inside the zkVM.
- `zk/script` executes the guest, generates a Groth16 fixture, and prints the program vkey.
- `zk/contracts/SP1RiteVerifier.sol` checks the SP1 proof, compares public values against `Rite`, and marks the workflow as proof-verified.

The Rust verifier checks the parts that matter for an evidence trail:

- exactly three roles in order: `researcher -> critic -> finalizer`;
- every step consumes the previous step’s exact output;
- timestamps strictly increase;
- every step uses the same policy hash;
- the final report matches the finalizer output byte-for-byte;
- the rebuilt Merkle root matches the public value.

The ZK layer is not claiming the model reasoned correctly. It proves that these agents, in this order, with these inputs and outputs, produced exactly this report, and that the committed trail was not changed afterwards.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`, paste a Solidity contract and create an audit record.

Local development writes to `data/workflows.json` unless Upstash Redis env vars are present.

## Environment

Deploy `Rite.sol` to Ritual, then set:

```bash
NEXT_PUBLIC_CHAIN_ID=1979
NEXT_PUBLIC_RITE_ADDRESS=0xYourRiteContract
NEXT_PUBLIC_RITUAL_RPC_URL=https://rpc.ritualfoundation.org
NEXT_PUBLIC_RITUAL_EXPLORER_URL=https://explorer.ritualfoundation.org
RITUAL_RPC_URL=https://rpc.ritualfoundation.org
RITUAL_EXPLORER_URL=https://explorer.ritualfoundation.org
RITE_ADDRESS=0xYourRiteContract
```

For production storage on Vercel, install Upstash Redis / Vercel KV and expose:

```bash
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

Do not put a deployer private key in Vercel for normal app usage. The public app commits with the visitor’s wallet.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/workflows` | List workflow receipts |
| `POST` | `/api/workflows` | Create a deterministic audit trail |
| `GET` | `/api/workflows/:id` | Read a receipt with proofs |
| `POST` | `/api/workflows/:id/commit` | Store a verified onchain commit receipt |
| `POST` | `/api/workflows/:id/verify-step` | Verify a step locally and optionally against Ritual |

## Checks

```bash
npm run typecheck
npm run build
cd zk && cargo test -p rite-lib
cd zk/script && cargo run --release --bin prove -- --execute
```

`cargo run --release --bin prove -- --execute` runs the SP1 guest without generating a full proof. Full Groth16 proving is available through the same host with the SP1 toolchain installed.
