'use client'

import { useState } from 'react'
import { createPublicClient, createWalletClient, custom, defineChain, http, isAddress } from 'viem'
import { hashText } from '@/lib/hashing'
import { riteAbi } from '@/lib/rite-abi'
import type { Workflow } from '@/lib/types'

declare global {
  interface Window {
    ethereum?: Parameters<typeof custom>[0]
  }
}

const ritual = defineChain({
  id: 1979,
  name: 'Ritual Testnet',
  nativeCurrency: { name: 'Ritual', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? 'https://rpc.ritualfoundation.org'] },
  },
})

export function WorkflowActions({ workflow }: { workflow: Workflow }) {
  const [message, setMessage] = useState('')

  async function seal() {
    setMessage('Submitting seal...')
    try {
      const response = await fetch(`/api/workflows/${workflow.id}/seal`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Seal failed.')
      setMessage(`Submitted: ${data.seal.txHash}`)
    } catch (error) {
      const serverMessage = error instanceof Error ? error.message : 'Seal failed.'
      if (!serverMessage.includes('PRIVATE_KEY')) {
        setMessage(serverMessage)
        return
      }
      await sealWithWallet()
    }
  }

  async function sealWithWallet() {
    const address = process.env.NEXT_PUBLIC_RITE_ADDRESS
    if (!address || !isAddress(address)) {
      setMessage('Set NEXT_PUBLIC_RITE_ADDRESS before sealing.')
      return
    }
    if (!window.ethereum) {
      setMessage('Server signer is not configured and no injected wallet was found.')
      return
    }

    try {
      setMessage('Server signer unavailable. Waiting for wallet...')
      const walletClient = createWalletClient({ chain: ritual, transport: custom(window.ethereum) })
      const [account] = await walletClient.requestAddresses()
      const activeChain = await walletClient.getChainId()
      if (activeChain !== ritual.id) {
        await walletClient.switchChain({ id: ritual.id })
      }
      const txHash = await walletClient.writeContract({
        account,
        address,
        abi: riteAbi,
        functionName: 'submitWorkflow',
        args: [workflow.id, hashText(workflow.source), workflow.merkleRoot, workflow.reportHash, workflow.policyHash, ''],
      })
      const publicClient = createPublicClient({ chain: ritual, transport: http() })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      setMessage(`Submitted: ${txHash} (${receipt.status})`)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Wallet seal failed.')
    }
  }

  return <div className="action-block"><button className="primary-button" onClick={seal}>Seal on Ritual</button>{message && <p className="mono muted break-anywhere">{message}</p>}</div>
}
