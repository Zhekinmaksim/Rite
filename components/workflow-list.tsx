import Link from 'next/link'
import type { Workflow } from '@/lib/types'

export function WorkflowList({ initial }: { initial: Workflow[] }) {
  if (!initial.length) return <p className="muted">No records yet. The first receipt will appear after an ordered trail is generated.</p>
  return <div className="list">{initial.slice(0, 8).map(workflow => <Link key={workflow.id} className="receipt" href={`/workflow/${workflow.id}`}><span className="status local">local</span><h3>{workflow.target}</h3><div className="mono muted">{workflow.id.slice(0, 14)}…{workflow.id.slice(-8)}</div></Link>)}</div>
}
