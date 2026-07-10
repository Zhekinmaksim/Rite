import { NextResponse } from 'next/server'
import { submitWorkflowOnchain } from '@/lib/chain'
import { workflowStore } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const workflow = await workflowStore.get(id)
    if (!workflow) return NextResponse.json({ error: 'Workflow not found.' }, { status: 404 })
    const seal = await submitWorkflowOnchain(workflow)
    return NextResponse.json({ seal })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to seal workflow.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
