import { workflowStore } from '@/lib/store'
import { CreateWorkflowForm } from '@/components/create-workflow-form'
import { WorkflowList } from '@/components/workflow-list'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const workflows = await workflowStore.list()
  return <main>
    <nav className="nav"><a className="brand" href="/"><i>R</i>ITE</a><span className="chain">Ritual ready · 1979</span></nav>
    <section className="hero"><span className="eyebrow">agent proof trail</span><h1>Make the work<br />provable.</h1><p>Rite turns a three-stage agent workflow into a verifiable trail. Each step is witnessed locally, bound into a Merkle root, and ready to seal on Ritual.</p></section>
    <section className="grid"><div className="panel"><h2>Start a rite</h2><CreateWorkflowForm /></div><div className="panel"><h2>Recent workflows</h2><WorkflowList initial={workflows} /></div></section>
    <footer className="footer">performed in order · witnessed · sealed · break the order and the rite is void</footer>
  </main>
}
