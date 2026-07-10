import { notFound } from 'next/navigation'
import { workflowStore } from '@/lib/store'
import { VerifyStep } from '@/components/verify-step'

export const dynamic = 'force-dynamic'

export default async function VerifyStepPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ index?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const workflow = await workflowStore.get(id)
  const index = Number(query.index ?? '0')
  if (!workflow || !Number.isInteger(index) || !workflow.steps[index]) notFound()
  const step = workflow.steps[index]
  return <main><nav className="nav"><a className="brand" href={`/workflow/${id}`}><i>←</i> RITE</a><span className="status local">verification</span></nav><section className="hero"><span className="eyebrow">proof check</span><h1>Verify the<br />witness.</h1><p>Recompute the sorted-pair Merkle path locally, then ask the deployed Rite contract for the same answer when it is configured.</p></section><section className="grid"><div className="panel"><h2>Step {index + 1}: {step.role}</h2><p className="mono">{step.hash}</p><VerifyStep workflowId={workflow.id} index={index} /></div><aside className="panel"><h2>Proof path</h2>{step.proof.map((hash, position) => <p key={hash} className="mono muted">{position + 1}. {hash}</p>)}<p className="label">Expected root</p><p className="mono">{workflow.merkleRoot}</p></aside></section></main>
}
