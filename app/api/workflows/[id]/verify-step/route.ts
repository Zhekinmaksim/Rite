import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyStepOnchain } from '@/lib/chain'
import { verifyMerkleProof } from '@/lib/merkle'
import { workflowStore } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const bodySchema = z.object({ index: z.number().int().min(0).max(2) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { index } = bodySchema.parse(await request.json())
    const workflow = await workflowStore.get(id)
    if (!workflow) return NextResponse.json({ error: 'Workflow not found.' }, { status: 404 })
    const step = workflow.steps[index]
    if (!step) return NextResponse.json({ error: 'Step not found.' }, { status: 404 })
    const local = verifyMerkleProof(step.hash, step.proof, workflow.merkleRoot)
    let onchain: 'verified' | 'unavailable' | 'failed' = 'unavailable'
    let reason: string | undefined
    try { const verified = await verifyStepOnchain(workflow, step); if (verified !== null) onchain = verified ? 'verified' : 'failed' } catch { onchain = 'failed'; reason = 'Ritual RPC or contract call failed.' }
    return NextResponse.json({ workflowId: workflow.id, index, local, onchain, reason })
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Invalid verification request.' : 'Unable to verify step.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
