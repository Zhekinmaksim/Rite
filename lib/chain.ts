import { createPublicClient, http, isAddress } from 'viem'
import { defineChain } from 'viem'
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

export function ritualPublicClient() {
  return createPublicClient({ chain: ritual, transport: http(configuredRpcUrl()) })
}

export async function verifyStepOnchain(workflow: Workflow, step: TrailStep): Promise<boolean | null> {
  const address = configuredRiteAddress()
  if (!address) return null
  const client = ritualPublicClient()
  return client.readContract({
    address,
    abi: riteAbi,
    functionName: 'verifyStep',
    args: [workflow.id, step.hash, step.proof]
  })
}
