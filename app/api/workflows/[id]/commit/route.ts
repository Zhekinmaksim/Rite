import { NextResponse } from 'next/server'
import { decodeFunctionData } from 'viem'
import { z } from 'zod'
import { configuredRiteAddress, ritual, ritualPublicClient } from '@/lib/chain'
import { hashText } from '@/lib/hashing'
import { riteAbi } from '@/lib/rite-abi'
import { workflowStore } from '@/lib/store'
import type { Hex } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  committedBy: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()
})

const sameAddress = (a: string | null | undefined, b: string | null | undefined) =>
  Boolean(a && b && a.toLowerCase() === b.toLowerCase())

const sameHex = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { txHash, committedBy } = bodySchema.parse(await request.json())
    const workflow = await workflowStore.get(id)
    if (!workflow) return NextResponse.json({ error: 'Workflow not found.' }, { status: 404 })

    const riteAddress = configuredRiteAddress()
    if (!riteAddress) return NextResponse.json({ error: 'Rite contract is not configured.' }, { status: 503 })

    const client = ritualPublicClient()
    const [transaction, receipt] = await Promise.all([
      client.getTransaction({ hash: txHash as Hex }),
      client.getTransactionReceipt({ hash: txHash as Hex })
    ])

    if (!sameAddress(transaction.to, riteAddress)) {
      return NextResponse.json({ error: 'Transaction does not target the configured Rite contract.' }, { status: 400 })
    }
    if (committedBy && !sameAddress(transaction.from, committedBy)) {
      return NextResponse.json({ error: 'Transaction signer does not match committedBy.' }, { status: 400 })
    }
    const decoded = decodeFunctionData({ abi: riteAbi, data: transaction.input })
    if (decoded.functionName !== 'submitWorkflow') {
      return NextResponse.json({ error: 'Transaction is not submitWorkflow.' }, { status: 400 })
    }
    const [workflowId, taskHash, merkleRoot, reportHash, policyHash] = decoded.args
    if (
      !sameHex(workflowId, workflow.id) ||
      !sameHex(taskHash, hashText(workflow.source)) ||
      !sameHex(merkleRoot, workflow.merkleRoot) ||
      !sameHex(reportHash, workflow.reportHash) ||
      !sameHex(policyHash, workflow.policyHash)
    ) {
      return NextResponse.json({ error: 'Transaction calldata does not match this workflow.' }, { status: 400 })
    }

    const updated = await workflowStore.recordCommit(workflow.id, {
      txHash: txHash as Hex,
      committedBy: transaction.from as Hex,
      chainId: ritual.id,
      chainStatus: receipt.status,
      committedAt: Date.now(),
      blockNumber: receipt.blockNumber.toString()
    })

    if (!updated) return NextResponse.json({ error: 'Workflow not found.' }, { status: 404 })
    return NextResponse.json({ workflow: updated }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Invalid commit payload.' : error instanceof Error ? error.message : 'Unable to record commit.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
