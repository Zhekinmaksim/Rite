export const riteAbi = [
  {
    type: 'function',
    name: 'submitWorkflow',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'workflowId', type: 'bytes32' },
      { name: 'taskHash', type: 'bytes32' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'reportHash', type: 'bytes32' },
      { name: 'policyHash', type: 'bytes32' },
      { name: 'metadataURI', type: 'string' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'verifyStep',
    stateMutability: 'view',
    inputs: [
      { name: 'workflowId', type: 'bytes32' },
      { name: 'stepHash', type: 'bytes32' },
      { name: 'proof', type: 'bytes32[]' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const
