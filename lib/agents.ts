import { hashText, stepHash } from '@/lib/hashing'
import { merkleProof, merkleRoot } from '@/lib/merkle'
import type { AgentRole, TrailStep, Workflow } from '@/lib/types'

const signalChecks: Array<[RegExp, string]> = [
  [/tx\.origin/i, 'tx.origin used for authorization, replace it with msg.sender.'],
  [/(call\{|\.call\()/i, 'External low-level call detected, inspect checks-effects-interactions and reentrancy protection.'],
  [/delegatecall/i, 'delegatecall detected, restrict the implementation target and validate storage layout.'],
  [/(transfer\(|send\()/i, 'Native-value transfer detected, account for recipient failure and reentrancy boundaries.'],
  [/selfdestruct/i, 'selfdestruct detected, confirm it is intentionally reachable and policy-approved.']
]

function findingsFor(source: string): string[] {
  const hits = signalChecks.filter(([pattern]) => pattern.test(source)).map(([, finding]) => finding)
  return hits.length ? hits : ['No high-signal heuristic matched. Manual review is still required before sealing.']
}

function outputFor(role: AgentRole, findings: string[], target: string): string {
  if (role === 'researcher') return `Mapped ${findings.length} audit signals for ${target}: ${findings.join(' ')}`
  if (role === 'critic') return `Challenged the initial pass. Priority is evidence around authorization, call ordering, and reachable privilege boundaries.`
  return `Final assessment: ${findings.length} machine-detected signal(s). This trail is an evidence receipt, not a substitute for a human security audit.`
}

export function runAgents(input: { id: Workflow['id']; target: string; brief: string; source: string }): Workflow {
  const policyHash = hashText('rite.policy.v1:researcher>critic>finalizer')
  const startedAt = Date.now()
  const findings = findingsFor(input.source)
  const roles: AgentRole[] = ['researcher', 'critic', 'finalizer']
  let previousOutput = hashText(`${input.target}\n${input.brief}\n${input.source}`)
  const drafts = roles.map((role, index) => {
    const timestamp = startedAt + index + 1
    const output = outputFor(role, findings, input.target)
    const outputHash = hashText(output)
    const hash = stepHash({ role, timestamp, inputHash: previousOutput, outputHash, policyHash })
    const step = { index, role, timestamp, inputHash: previousOutput, outputHash, policyHash, hash, output, findings }
    previousOutput = outputHash
    return step
  })
  const leaves = drafts.map(step => step.hash)
  const root = merkleRoot(leaves)
  const steps: TrailStep[] = drafts.map(step => ({ ...step, proof: merkleProof(leaves, step.index) }))
  const report = steps.at(-1)?.output ?? ''
  return {
    id: input.id,
    createdAt: startedAt,
    target: input.target,
    brief: input.brief,
    source: input.source,
    policyHash,
    merkleRoot: root,
    reportHash: hashText(report),
    report,
    steps
  }
}
