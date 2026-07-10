import { notFound } from 'next/navigation'
import { workflowStore } from '@/lib/store'
import { WorkflowActions } from '@/components/workflow-actions'

export const dynamic = 'force-dynamic'

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workflow = await workflowStore.get(id)
  if (!workflow) notFound()
  return <main>
    <nav className="nav"><a className="brand" href="/"><i>R</i>ITE</a><span className="status local">local receipt</span></nav>
    <section className="workflow-header"><div><span className="eyebrow">workflow receipt</span><h1>{workflow.target}</h1><p className="mono muted">{workflow.id}</p></div><WorkflowActions workflow={workflow} /></section>
    <section className="grid"><div className="panel"><h2>Performed trail</h2><div className="steps">{workflow.steps.map(step => <article className="step" key={step.hash}><div className="step-head"><h3>0{step.index + 1} / {step.role}</h3><span className="status local">witnessed</span></div><p className="muted">{step.output}</p><ul className="findings">{step.findings.map(finding => <li key={finding}>{finding}</li>)}</ul><div className="mono muted">leaf {step.hash}</div><div className="actions"><a className="button" href={`/workflow/${workflow.id}/verify-step?index=${step.index}`}>Verify step</a></div></article>)}</div></div><aside className="panel"><h2>Seal payload</h2><p className="label">Merkle root</p><p className="mono">{workflow.merkleRoot}</p><p className="label">Report hash</p><p className="mono">{workflow.reportHash}</p><p className="label">Policy hash</p><p className="mono">{workflow.policyHash}</p><p className="muted">The server signs this seal with PRIVATE_KEY and writes the four bound values to Rite. The proof remains independently verifiable.</p></aside></section>
  </main>
}
