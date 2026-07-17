import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyStepOnchain } from '@/lib/chain'
import { verifyMerkleProof } from '@/lib/merkle'
import { workflowStore } from '@/lib/store'
import type { Hex } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const bodySchema = z.object({ index: z.number().int().min(0).max(2), tamper: z.boolean().optional() })

function tamperHash(hash: Hex): Hex {
  const lastByte = hash.slice(-2).toLowerCase()
  return `${hash.slice(0, -2)}${lastByte === '00' ? '01' : '00'}` as Hex
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { index, tamper = false } = bodySchema.parse(await request.json())
    const workflow = await workflowStore.get(id)
    if (!workflow) return NextResponse.json({ error: 'Workflow not found.' }, { status: 404 })
    const storedStep = workflow.steps[index]
    if (!storedStep) return NextResponse.json({ error: 'Step not found.' }, { status: 404 })
    const step = tamper ? { ...storedStep, hash: tamperHash(storedStep.hash) } : storedStep
    const local = verifyMerkleProof(step.hash, step.proof, workflow.merkleRoot)
    let onchain: 'verified' | 'unavailable' | 'failed' = 'unavailable'
    let reason: string | undefined
    try { const verified = await verifyStepOnchain(workflow, step); if (verified !== null) onchain = verified ? 'verified' : 'failed' } catch { onchain = 'failed'; reason = 'Ritual RPC or contract call failed.' }
    if (tamper) reason = reason ?? 'Tamper demo changed one byte of the step hash before verification.'
    return NextResponse.json({ workflowId: workflow.id, index, local, onchain, tampered: tamper, reason })
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Invalid verification request.' : 'Unable to verify step.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
