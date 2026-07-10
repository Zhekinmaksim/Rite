# Rite

Every workflow is a rite: performed in order, witnessed, sealed. Break the order and the rite is void, no proof can exist.

Rite creates a deterministic three-step agent trail, produces an OpenZeppelin-compatible sorted-pair Merkle root, and exposes it through a dark technical dashboard and REST API. The UI can verify a leaf locally and, when a Rite contract address is configured, call `verifyStep` directly on Ritual testnet.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`, paste a Solidity fragment and create a workflow. Local development writes to `data/workflows.json` unless Upstash Redis env vars are present.

## Contract configuration

Deploy `Rite.sol` to Ritual, then set:

```bash
NEXT_PUBLIC_CHAIN_ID=1979
NEXT_PUBLIC_RITE_ADDRESS=0xYourRiteContract
NEXT_PUBLIC_RITUAL_RPC_URL=https://rpc.ritualfoundation.org
RITUAL_RPC_URL=https://rpc.ritualfoundation.org
RITE_ADDRESS=0xYourRiteContract
PRIVATE_KEY=0xServerSealWallet
```

The browser never receives `PRIVATE_KEY`. The server-side seal route signs `submitWorkflow` with `PRIVATE_KEY`, while onchain verification remains read-only.

## Vercel storage

Vercel serverless functions cannot use `data/workflows.json` as durable storage. Install Upstash KV from the Vercel Marketplace or set these variables before production deploy:

```bash
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/workflows` | List workflow receipts |
| `POST` | `/api/workflows` | Create a deterministic audit trail |
| `GET` | `/api/workflows/:id` | Read a receipt with proofs |
| `POST` | `/api/workflows/:id/seal` | Submit the workflow root to Rite using `PRIVATE_KEY` |
| `POST` | `/api/workflows/:id/verify-step` | Verify a step locally and optionally on Ritual |

## Deployment

Verify the deployed contract's `submitWorkflow` and `verifyStep` signatures against `lib/rite-abi.ts`, set the public contract address, set Upstash Redis env vars, and run:

```bash
npm run typecheck
npm run build
```
