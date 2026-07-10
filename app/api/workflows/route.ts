import { NextResponse } from 'next/server'
import { z } from 'zod'
import { runAgents } from '@/lib/agents'
import { createWorkflowId } from '@/lib/hashing'
import { workflowStore } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const inputSchema = z.object({
  target: z.string().trim().min(2).max(120),
  brief: z.string().trim().min(12).max(2000),
  source: z.string().trim().min(8).max(24000)
})

export async function GET() {
  try {
    return NextResponse.json({ workflows: await workflowStore.list() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to list workflows.' }, { status: 503 })
  }
}

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json())
    const id = createWorkflowId(input.target, input.brief)
    const workflow = runAgents({ id, ...input })
    await workflowStore.create(workflow)
    return NextResponse.json({ workflow }, { status: 201 })
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? 'Invalid workflow input.' : error instanceof Error ? error.message : 'Unable to create workflow.'
    return NextResponse.json({ error: message }, { status: error instanceof z.ZodError ? 400 : 503 })
  }
}
