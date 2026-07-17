import { notFound } from 'next/navigation'
import { addressExplorerUrl, txExplorerUrl } from '@/lib/explorer'
import { workflowStore } from '@/lib/store'
import { WorkflowActions } from '@/components/workflow-actions'

export const dynamic = 'force-dynamic'

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workflow = await workflowStore.get(id)
  if (!workflow) notFound()
  const findings = Array.from(new Set(workflow.steps.flatMap(step => step.findings)))
  const finalizer = workflow.steps.find(step => step.role === 'finalizer') ?? workflow.steps.at(-1)
  const sealed = workflow.onchain?.chainStatus === 'success'
  return <div className="page-stack">
    <section className="workflow-header">
      <div className="min-zero">
        <h1>Audit record</h1>
        <p className="mono muted break-anywhere">{workflow.id}</p>
      </div>
      <span className={sealed ? 'stamp stamp-verified' : 'stamp'}>
        {sealed ? 'sealed' : 'local'}
      </span>
    </section>

    <section className={sealed ? 'receipt result-card result-card-sealed' : 'receipt result-card'}>
      <div className="result-head">
        <div>
          <p className="eyebrow">Result</p>
          <h2>{findings.length > 0 ? 'Review required' : 'No machine signals detected'}</h2>
        </div>
        <span className={sealed ? 'stamp stamp-verified' : 'stamp'}>{sealed ? 'sealed on Ritual' : 'not signed yet'}</span>
      </div>
      <p className="result-summary">{finalizer?.output ?? workflow.report}</p>
      <div className="result-metrics mono">
        <div><span>risk signals</span><strong>{findings.length}</strong></div>
        <div><span>steps</span><strong>{workflow.steps.length}</strong></div>
        <div><span>commit</span><strong className={sealed ? 'onchain-text' : 'accent'}>{sealed ? 'onchain' : 'local'}</strong></div>
      </div>
      {findings.length > 0 && <div>
        <p className="label">Main issues</p>
        <ul className="result-findings">
          {findings.map(finding => <li key={finding}>{finding}</li>)}
        </ul>
      </div>}
      <div className="mono data-block">
        <DataRow label="report hash" value={workflow.reportHash} />
        <DataRow label="merkle root" value={workflow.merkleRoot} accent />
        {workflow.onchain && <DataLink label="tx" value={workflow.onchain.txHash} href={txExplorerUrl(workflow.onchain.txHash)} accent />}
      </div>
    </section>

    <section className="receipt mono">
      <DataRow label="target" value={workflow.target} />
      <DataRow label="policy hash" value={workflow.policyHash} />
      <DataRow label="merkle root" value={workflow.merkleRoot} accent />
      <DataRow label="report hash" value={workflow.reportHash} />
      <DataRow label="created" value={new Date(workflow.createdAt).toISOString()} />
      {workflow.onchain && <>
        <DataRow label="chain status" value={workflow.onchain.chainStatus} accent={workflow.onchain.chainStatus === 'success'} />
        <DataLink label="committed by" value={workflow.onchain.committedBy} href={addressExplorerUrl(workflow.onchain.committedBy)} />
        <DataLink label="tx" value={workflow.onchain.txHash} href={txExplorerUrl(workflow.onchain.txHash)} accent />
        {workflow.onchain.blockNumber && <DataRow label="block" value={workflow.onchain.blockNumber} />}
      </>}
    </section>

    <section>
      <h2 className="section-title">Evidence trail · {workflow.steps.length} steps</h2>
      <ol className="step-list">
        {workflow.steps.map(step => (
          <li key={step.hash} className="receipt step-card">
            <div className="step-head">
              <span>{step.index + 1}. {step.role}</span>
              <span className="stamp">witnessed</span>
            </div>
            <pre className="step-output">{step.output}</pre>
            {step.findings.length > 0 && <ul className="findings">{step.findings.map(finding => <li key={finding}>{finding}</li>)}</ul>}
            <div className="mono data-block">
              <DataRow label="input hash" value={step.inputHash} />
              <DataRow label="output hash" value={step.outputHash} />
              <DataRow label="step hash" value={step.hash} accent />
            </div>
            <a href={`/workflow/${workflow.id}/verify-step?index=${step.index}`} className="mono link">Verify this step against the root</a>
          </li>
        ))}
      </ol>
    </section>

    <section className="receipt">
      <h2>Commit onchain</h2>
      <p className="muted">Signs submitWorkflow from the connected wallet and commits workflowId, task hash, Merkle root, report hash and policy hash to Rite on Ritual Chain. No server signer is used.</p>
      <WorkflowActions workflow={workflow} />
    </section>
  </div>
}

function DataRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className="data-row">
    <span>{label}</span>
    <span className={accent ? 'accent break-anywhere' : 'break-anywhere'}>{value}</span>
  </div>
}

function DataLink({ label, value, href, accent }: { label: string; value: string; href: string; accent?: boolean }) {
  return <div className="data-row">
    <span>{label}</span>
    <a className={accent ? 'accent link break-anywhere' : 'link break-anywhere'} href={href} target="_blank" rel="noreferrer">{value}</a>
  </div>
}
