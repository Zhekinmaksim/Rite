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
  return <div className="page-stack">
    <section className="hero compact">
      <h1>Verify step</h1>
      <p className="mono break-anywhere">workflow {workflow.id}</p>
    </section>
    <section className="two-column">
      <div className="receipt">
        <h2>Step {index + 1}: {step.role}</h2>
        <p className="mono accent break-anywhere">{step.hash}</p>
        <VerifyStep workflowId={workflow.id} index={index} />
      </div>
      <aside className="receipt">
        <h2>Proof path</h2>
        {step.proof.length === 0 ? <p className="mono muted">(single leaf)</p> : step.proof.map((hash, position) => <p key={hash} className="mono muted break-anywhere">{position + 1}. {hash}</p>)}
        <p className="label">Expected root</p>
        <p className="mono break-anywhere">{workflow.merkleRoot}</p>
      </aside>
    </section>
    <a href={`/workflow/${workflow.id}`} className="mono link">Back to workflow</a>
  </div>
}
