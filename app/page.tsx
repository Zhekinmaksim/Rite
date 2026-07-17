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
          brief: 'Run a three-agent audit and produce a verifiable Rite receipt.',
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
    <section className="hero">
      <h1>Every workflow is a rite.</h1>
      <p>Three agents audit your Solidity contract: a researcher finds issues, a critic challenges them, a finalizer signs the verdict. Each step is hashed and chained; the whole trail is anchored by a Merkle root you can commit to Ritual Chain and verify step by step.</p>
    </section>

    <section className="receipt">
      <div className="section-head">
        <h2>Submit a contract for audit</h2>
        <span>researcher - critic - finalizer</span>
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
        {running ? 'Running agents...' : 'Run 3-agent audit'}
      </button>
    </section>

    <section>
      <h2 className="section-title">Workflows</h2>
      {workflows.length === 0 ? (
        <p className="muted mono">No workflows yet. Run your first audit above.</p>
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
