export type Hex = `0x${string}`
export type AgentRole = 'researcher' | 'critic' | 'finalizer'

export type TrailStep = {
  index: number
  role: AgentRole
  timestamp: number
  inputHash: Hex
  outputHash: Hex
  policyHash: Hex
  hash: Hex
  output: string
  findings: string[]
  proof: Hex[]
}

export type Workflow = {
  id: Hex
  createdAt: number
  target: string
  brief: string
  source: string
  policyHash: Hex
  merkleRoot: Hex
  reportHash: Hex
  report: string
  steps: TrailStep[]
}

export type VerifyResult = {
  workflowId: Hex
  index: number
  local: boolean
  onchain: 'verified' | 'unavailable' | 'failed'
  reason?: string
}
