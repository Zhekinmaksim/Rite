'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateWorkflowForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null)
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/workflows', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) })
    const data = await response.json() as { workflow?: { id: string }; error?: string }
    setPending(false)
    if (!response.ok || !data.workflow) { setError(data.error ?? 'Could not create the workflow.'); return }
    router.push(`/workflow/${data.workflow.id}`)
  }
  return <form onSubmit={submit}>
    <label className="field">Target<input required name="target" maxLength={120} placeholder="Vault.sol or 0x…" /></label>
    <label className="field">Audit brief<textarea required name="brief" minLength={12} maxLength={2000} placeholder="What must this rite establish?" /></label>
    <label className="field">Solidity or evidence<textarea required name="source" minLength={8} maxLength={24000} placeholder="Paste the relevant contract fragment or execution evidence." /></label>
    <button className="button" disabled={pending}>{pending ? 'Witnessing…' : 'Perform rite →'}</button>
    {error && <p className="error">{error}</p>}
  </form>
}
