import { concatHex, keccak256 } from 'viem'
import type { Hex } from '@/lib/types'

const sortPair = (a: Hex, b: Hex): [Hex, Hex] => (a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a])
const combine = (a: Hex, b: Hex): Hex => keccak256(concatHex(sortPair(a, b)))

export function merkleRoot(leaves: Hex[]): Hex {
  if (leaves.length === 0) throw new Error('Cannot create a Merkle root without steps')
  let level = [...leaves]
  while (level.length > 1) {
    const next: Hex[] = []
    for (let i = 0; i < level.length; i += 2) {
      next.push(level[i + 1] ? combine(level[i], level[i + 1]) : level[i])
    }
    level = next
  }
  return level[0]
}

export function merkleProof(leaves: Hex[], index: number): Hex[] {
  if (index < 0 || index >= leaves.length) throw new Error('Step index is out of range')
  const proof: Hex[] = []
  let cursor = index
  let level = [...leaves]
  while (level.length > 1) {
    const sibling = cursor ^ 1
    if (sibling < level.length) proof.push(level[sibling])
    const next: Hex[] = []
    for (let i = 0; i < level.length; i += 2) {
      next.push(level[i + 1] ? combine(level[i], level[i + 1]) : level[i])
    }
    cursor = Math.floor(cursor / 2)
    level = next
  }
  return proof
}

export function verifyMerkleProof(leaf: Hex, proof: Hex[], root: Hex): boolean {
  return proof.reduce<Hex>((current, sibling) => combine(current, sibling), leaf).toLowerCase() === root.toLowerCase()
}
