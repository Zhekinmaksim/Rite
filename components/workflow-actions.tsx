'use client'

import { useState } from 'react'
import type { Workflow } from '@/lib/types'

export function WorkflowActions({ workflow }: { workflow: Workflow }) {
  const [message, setMessage] = useState('')

  async function seal() {
    setMessage('Submitting seal...')
    try {
      const response = await fetch(`/api/workflows/${workflow.id}/seal`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Seal failed.')
      setMessage(`Submitted: ${data.seal.txHash}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Seal failed.')
    }
  }

  return <div><button className="button" onClick={seal}>Seal on Ritual</button>{message && <p className="mono muted">{message}</p>}</div>
}
