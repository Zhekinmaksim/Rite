import { createPublicClient, createWalletClient, http, isAddress } from 'viem'
import { defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { riteAbi } from '@/lib/rite-abi'
import type { Hex, TrailStep, Workflow } from '@/lib/types'

export const ritual = defineChain({
  id: 1979,
  name: 'Ritual Testnet',
  nativeCurrency: { name: 'Ritual', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: { default: { http: [process.env.RITUAL_RPC_URL ?? process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? 'https://rpc.ritualfoundation.org'] } }
})

export function configuredRiteAddress(): Hex | null {
  const address = process.env.RITE_ADDRESS ?? process.env.NEXT_PUBLIC_RITE_ADDRESS
  return address && isAddress(address) ? (address as Hex) : null
}

function configuredRpcUrl() {
  return process.env.RITUAL_RPC_URL ?? process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? 'https://rpc.ritualfoundation.org'
}

function configuredPrivateKey(): Hex | null {
  const key = process.env.PRIVATE_KEY?.trim()
  if (!key) return null
  return (key.startsWith('0x') ? key : `0x${key}`) as Hex
}

export async function verifyStepOnchain(workflow: Workflow, step: TrailStep): Promise<boolean | null> {
  const address = configuredRiteAddress()
  if (!address || !process.env.RITUAL_RPC_URL) return null
  const client = createPublicClient({ chain: ritual, transport: http(configuredRpcUrl()) })
  return client.readContract({
    address,
    abi: riteAbi,
    functionName: 'verifyStep',
    args: [workflow.id, step.hash, step.proof]
  })
}

export async function submitWorkflowOnchain(workflow: Workflow) {
  const address = configuredRiteAddress()
  const privateKey = configuredPrivateKey()
  if (!address) throw new Error('Set RITE_ADDRESS or NEXT_PUBLIC_RITE_ADDRESS before sealing.')
  if (!privateKey) throw new Error('Set PRIVATE_KEY before server-side sealing.')

  const account = privateKeyToAccount(privateKey)
  const publicClient = createPublicClient({ chain: ritual, transport: http(configuredRpcUrl()) })
  const walletClient = createWalletClient({ account, chain: ritual, transport: http(configuredRpcUrl()) })
  const txHash = await walletClient.writeContract({
    address,
    abi: riteAbi,
    functionName: 'submitWorkflow',
    args: [workflow.id, workflow.merkleRoot, workflow.reportHash, workflow.policyHash]
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  return { txHash, blockNumber: receipt.blockNumber.toString(), status: receipt.status }
}
