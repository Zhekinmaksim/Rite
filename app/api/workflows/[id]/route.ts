import { NextResponse } from 'next/server'
import { workflowStore } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workflow = await workflowStore.get(id)
  if (!workflow) return NextResponse.json({ error: 'Workflow not found.' }, { status: 404 })
  return NextResponse.json({ workflow }, { headers: { 'Cache-Control': 'no-store' } })
}
