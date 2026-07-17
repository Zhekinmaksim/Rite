'use client'

import { useState } from 'react'
import type { VerifyResult } from '@/lib/types'

export function VerifyStep({ workflowId, index }: { workflowId: string; index: number }) {
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function verify(tamper = false) {
    setError(null); setResult(null)
    const response = await fetch(`/api/workflows/${workflowId}/verify-step`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ index, tamper }) })
    const data = await response.json() as VerifyResult & { error?: string }
    if (!response.ok) { setError(data.error ?? 'Verification failed.'); return }
    setResult(data)
  }
  return <div className="actions">
    <button className="button" onClick={() => verify(false)}>Run verification →</button>
    <button className="button secondary-button" onClick={() => verify(true)}>Tamper one byte →</button>
    {error && <p className="error">{error}</p>}
    {result && <div className="verify-result">
      {result.tampered && <p><span className="status local">tampered input</span></p>}
      <p><span className={`status ${result.local ? 'onchain' : 'local'}`}>local: {result.local ? 'valid' : 'invalid'}</span></p>
      <p><span className={`status ${result.onchain === 'verified' ? 'onchain' : 'local'}`}>onchain: {result.onchain}</span></p>
      {result.reason && <p className="muted">{result.reason}</p>}
    </div>}
  </div>
}
