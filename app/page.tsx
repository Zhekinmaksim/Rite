'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Workflow } from '@/lib/types'

const placeholder = `pragma solidity ^0.7.0;

contract Bank {
    mapping(address => uint) balances;

    function withdraw() external {
        (bool ok, ) = msg.sender.call{value: balances[msg.sender]}("");
        require(ok);
        balances[msg.sender] = 0;
    }
}`

function inferTarget(source: string) {
  return source.match(/contract\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1] ?? 'Solidity evidence'
}

export default function Home() {
  const router = useRouter()
  const [source, setSource] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])

  useEffect(() => {
    fetch('/api/workflows')
      .then(response => response.json())
      .then(data => setWorkflows(Array.isArray(data.workflows) ? data.workflows : []))
      .catch(() => setWorkflows([]))
  }, [])

  async function runAudit() {
    setError(null)
    setRunning(true)
    try {
      const trimmed = source.trim()
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: inferTarget(trimmed),
          brief: 'Produce an ordered audit record with a verifiable Merkle commitment.',
          source: trimmed
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'run failed')
      router.push(`/workflow/${data.workflow.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'run failed')
      setRunning(false)
    }
  }

  return <div className="page-stack">
    <section className="hero-grid">
      <div className="hero">
        <p className="eyebrow">Ritual Chain · scheme step.v1</p>
        <h1>Ordered audit records, committed onchain.</h1>
        <p>Rite turns a contract review into a deterministic evidence trail: researcher, critic, finalizer. Each step commits to its input, output and predecessor. The resulting Merkle root is signed by the user wallet and anchored on Ritual Chain.</p>
      </div>
      <div className="protocol-card" aria-label="Rite protocol summary">
        <div className="protocol-card-head">
          <span>Commit path</span>
          <em>step.v1</em>
        </div>
        <ol className="protocol-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Input</strong>
              <p>source → task hash</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Trail</strong>
              <p>ordered step hashes</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Commit</strong>
              <p>Merkle root → wallet</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section className="schematic-panel" aria-label="Rite workflow schematic">
      <img src="/rite-schematic.svg" alt="Rite workflow schematic showing ordered audit steps, Merkle root and proof verification" />
    </section>

    <section className="receipt">
      <div className="section-head">
        <h2>Create audit record</h2>
        <span>researcher / critic / finalizer</span>
      </div>
      <textarea
        value={source}
        onChange={event => setSource(event.target.value)}
        placeholder={placeholder}
        rows={13}
        className="code-input"
      />
      {error && <p className="error">{error}</p>}
      <button className="primary-button" onClick={runAudit} disabled={running || source.trim().length === 0}>
        {running ? 'Computing trail...' : 'Generate record'}
      </button>
    </section>

    <section>
      <h2 className="section-title">Records</h2>
      {workflows.length === 0 ? (
        <p className="muted mono">No records yet. Generate the first audit record above.</p>
      ) : (
        <ul className="workflow-list">
          {workflows.map(workflow => (
            <li key={workflow.id} className="workflow-row">
              <div className="min-zero">
                <a href={`/workflow/${workflow.id}`} className="mono link break-anywhere">{workflow.id}</a>
                <div className="mono subline">
                  {new Date(workflow.createdAt).toISOString()} · {workflow.steps.length} steps · root {workflow.merkleRoot.slice(0, 18)}...
                </div>
              </div>
              <span className="stamp">local</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  </div>
}
