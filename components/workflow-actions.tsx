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
    const address = process.env.NEXT_PUBLIC_RITE_ADDRESS
    if (!address || !isAddress(address)) {
      setMessage('Set NEXT_PUBLIC_RITE_ADDRESS before committing onchain.')
      return
    }
    if (!window.ethereum) {
      setMessage('Connect an injected wallet to commit this record onchain.')
      return
    }

    try {
      setMessage('Waiting for wallet signature...')
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
      setMessage(`Committed: ${txHash} (${receipt.status})`)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Wallet commit failed.')
    }
  }

  return <div className="action-block"><button className="primary-button" onClick={seal}>Commit with wallet</button>{message && <p className="mono muted break-anywhere">{message}</p>}</div>
}
