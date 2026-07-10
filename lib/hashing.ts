import { encodePacked, keccak256, stringToHex, toHex } from 'viem'
import type { AgentRole, Hex } from '@/lib/types'

export const hashText = (value: string): Hex => keccak256(stringToHex(value))

export function stepHash(input: {
  role: AgentRole
  timestamp: number
  inputHash: Hex
  outputHash: Hex
  policyHash: Hex
}): Hex {
  return keccak256(
    encodePacked(
      ['bytes32', 'bytes32', 'bytes32', 'uint64', 'bytes32'],
      [input.inputHash, input.outputHash, hashText(input.role), BigInt(input.timestamp), input.policyHash]
    )
  )
}

export function createWorkflowId(target: string, brief: string): Hex {
  return hashText(`rite.workflow.v1:${target}:${brief}:${crypto.randomUUID()}`)
}

export function hashTimestamp(timestamp: number): Hex {
  return keccak256(toHex(timestamp, { size: 32 }))
}
