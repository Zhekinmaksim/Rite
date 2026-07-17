import { readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runAgents } from '../lib/agents'
import { hashText } from '../lib/hashing'
import type { Hex, Workflow } from '../lib/types'

type StepInput = {
  role: string
  input_hash: Hex
  output_hash: Hex
  policy_hash: Hex
  timestamp: number
}

type TrailInput = {
  workflow_id: Hex
  task: string
  policy: string
  final_report: string
  steps: StepInput[]
}

const POLICY = 'rite.policy.v1:researcher>critic>finalizer'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function has(name: string): boolean {
  return process.argv.includes(name)
}

function taskFor(workflow: Workflow): string {
  return `${workflow.target}\n${workflow.brief}\n${workflow.source}`
}

function toTrailInput(workflow: Workflow): TrailInput {
  return {
    workflow_id: workflow.id,
    task: taskFor(workflow),
    policy: POLICY,
    final_report: workflow.report,
    steps: workflow.steps.map(step => ({
      role: step.role,
      input_hash: step.inputHash,
      output_hash: step.outputHash,
      policy_hash: step.policyHash,
      timestamp: step.timestamp
    }))
  }
}

function expectedFor(workflow: Workflow) {
  return {
    workflowId: workflow.id,
    merkleRoot: workflow.merkleRoot,
    reportHash: workflow.reportHash,
    policyHash: hashText(POLICY),
    stepHashes: workflow.steps.map(step => step.hash)
  }
}

function deterministicVectorWorkflow(): Workflow {
  const originalNow = Date.now
  Date.now = () => 1_720_000_000_000
  try {
    return runAgents({
      id: '0x1111111111111111111111111111111111111111111111111111111111111111',
      target: 'RiteStressVault',
      brief: 'Review a vault with authorization, external calls and upgrade surface.',
      source: `pragma solidity ^0.8.24;

contract RiteStressVault {
    address public owner;
    address public implementation;
    mapping(address => uint256) public balances;

    constructor() {
        owner = msg.sender;
    }

    function withdraw() external {
        require(tx.origin == owner, "owner only");
        uint256 amount = balances[msg.sender];
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        balances[msg.sender] = 0;
    }

    function upgrade(bytes calldata data) external {
        require(tx.origin == owner, "owner only");
        (bool ok, ) = implementation.delegatecall(data);
        require(ok, "delegatecall failed");
    }

    function sweep(address payable to) external {
        require(tx.origin == owner, "owner only");
        to.transfer(address(this).balance);
    }
}`
    })
  } finally {
    Date.now = originalNow
  }
}

async function workflowFromLocalStore(id: string): Promise<Workflow> {
  const raw = await readFile('data/workflows.json', 'utf8')
  const workflows = JSON.parse(raw) as Workflow[]
  const workflow = workflows.find(item => item.id.toLowerCase() === id.toLowerCase())
  if (!workflow) throw new Error(`workflow not found in data/workflows.json: ${id}`)
  return workflow
}

async function main() {
  const out = arg('--out') ?? arg('--vector') ?? 'zk/input.json'
  const workflowId = arg('--workflow')
  const asVector = has('--with-expected') || Boolean(arg('--vector'))

  const workflow = workflowId ? await workflowFromLocalStore(workflowId) : deterministicVectorWorkflow()
  const input = toTrailInput(workflow)
  const payload = asVector ? { input, expected: expectedFor(workflow) } : input

  await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`wrote ${out}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
