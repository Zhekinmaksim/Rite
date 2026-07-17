'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPublicClient, createWalletClient, custom, defineChain, http, isAddress } from 'viem'
import { addressExplorerUrl, txExplorerUrl } from '@/lib/explorer'
import { hashText } from '@/lib/hashing'
import { riteAbi } from '@/lib/rite-abi'
import type { OnchainCommit, Workflow } from '@/lib/types'

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
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [commit, setCommit] = useState<OnchainCommit | undefined>(workflow.onchain)

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
      const publicClient = createPublicClient({ chain: ritual, transport: http(process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? 'https://rpc.ritualfoundation.org') })
      const [account] = await walletClient.requestAddresses()
      const activeChain = await walletClient.getChainId()
      if (activeChain !== ritual.id) {
        await walletClient.switchChain({ id: ritual.id })
      }
      const args = [workflow.id, hashText(workflow.source), workflow.merkleRoot, workflow.reportHash, workflow.policyHash, ''] as const
      const [gasPrice, gas] = await Promise.all([
        publicClient.getGasPrice(),
        publicClient.estimateContractGas({
          account,
          address,
          abi: riteAbi,
          functionName: 'submitWorkflow',
          args,
        })
      ])
      const txHash = await walletClient.writeContract({
        account,
        address,
        abi: riteAbi,
        functionName: 'submitWorkflow',
        args,
        gas,
        gasPrice,
        type: 'legacy',
      })
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      setMessage(`Committed: ${txHash} (${receipt.status}). Recording receipt...`)
      const response = await fetch(`/api/workflows/${workflow.id}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, committedBy: account }),
      })
      const data = await response.json() as { workflow?: Workflow; error?: string }
      if (!response.ok || !data.workflow?.onchain) throw new Error(data.error ?? 'Commit confirmed, but storage update failed.')
      setCommit(data.workflow.onchain)
      setMessage('Commit recorded.')
      router.refresh()
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Wallet commit failed.')
    }
  }

  return <div className="action-block">
    {commit && <div className="commit-card mono">
      <p><span>chain status</span><strong className={commit.chainStatus === 'success' ? 'onchain-text' : 'accent'}>{commit.chainStatus}</strong></p>
      <p><span>committed by</span><a className="link break-anywhere" href={addressExplorerUrl(commit.committedBy)} target="_blank" rel="noreferrer">{commit.committedBy}</a></p>
      <p><span>tx</span><a className="link break-anywhere" href={txExplorerUrl(commit.txHash)} target="_blank" rel="noreferrer">{commit.txHash}</a></p>
      <p><span>root</span><span className="break-anywhere">{workflow.merkleRoot}</span></p>
      {commit.blockNumber && <p><span>block</span><span>{commit.blockNumber}</span></p>}
    </div>}
    <button className="primary-button" onClick={seal}>{commit ? 'Commit again with wallet' : 'Commit with wallet'}</button>
    {message && <p className="mono muted break-anywhere">{message}</p>}
  </div>
}
