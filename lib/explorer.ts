import type { Hex } from '@/lib/types'

const fallbackExplorer = 'https://explorer.ritualfoundation.org'

export function ritualExplorerBase() {
  const configured = process.env.NEXT_PUBLIC_RITUAL_EXPLORER_URL ?? process.env.RITUAL_EXPLORER_URL ?? fallbackExplorer
  return configured.replace(/\/$/, '')
}

export function txExplorerUrl(txHash: Hex) {
  return `${ritualExplorerBase()}/tx/${txHash}`
}

export function addressExplorerUrl(address: Hex) {
  return `${ritualExplorerBase()}/address/${address}`
}
