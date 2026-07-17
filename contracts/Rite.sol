// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title Rite
/// @notice Public registry for multi-agent workflow audit trails.
///         Every workflow is anchored by a Merkle root of agent step hashes
///         plus a hash of the final report. Anyone can verify that a given
///         step belongs to a committed workflow.
///
///         Proof layers (in order of planned integration):
///         v1: Merkle inclusion proofs (this contract, live)
///         v2: SP1 zkVM proof over the full trail (see /zk)
///         v3: Ritual ZK precompile 0x0806 with AsyncDelivery callback
contract Rite {
    struct Workflow {
        address creator;
        bytes32 taskHash;
        bytes32 merkleRoot;
        bytes32 reportHash;
        bytes32 policyHash;
        string metadataURI;
        uint256 createdAt;
        bool proofVerified;
    }

    mapping(bytes32 => Workflow) private _workflows;

    /// @dev Placeholder for the future zk verifier / Ritual AsyncDelivery caller.
    address public proofAuthority;
    address public owner;

    event WorkflowSubmitted(
        bytes32 indexed workflowId,
        address indexed creator,
        bytes32 taskHash,
        bytes32 merkleRoot,
        bytes32 reportHash,
        string metadataURI
    );

    event StepVerified(bytes32 indexed workflowId, bytes32 stepHash, address verifier);

    event ProofVerified(bytes32 indexed workflowId, bytes32 publicValuesHash);

    error WorkflowExists(bytes32 workflowId);
    error WorkflowNotFound(bytes32 workflowId);
    error NotAuthorized();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
        proofAuthority = msg.sender;
    }

    function setProofAuthority(address authority) external onlyOwner {
        proofAuthority = authority;
    }

    /// @notice Anchor a finished multi-agent workflow onchain.
    function submitWorkflow(
        bytes32 workflowId,
        bytes32 taskHash,
        bytes32 merkleRoot,
        bytes32 reportHash,
        bytes32 policyHash,
        string calldata metadataURI
    ) external {
        if (_workflows[workflowId].createdAt != 0) revert WorkflowExists(workflowId);

        _workflows[workflowId] = Workflow({
            creator: msg.sender,
            taskHash: taskHash,
            merkleRoot: merkleRoot,
            reportHash: reportHash,
            policyHash: policyHash,
            metadataURI: metadataURI,
            createdAt: block.timestamp,
            proofVerified: false
        });

        emit WorkflowSubmitted(workflowId, msg.sender, taskHash, merkleRoot, reportHash, metadataURI);
    }

    /// @notice Verify that a step hash belongs to a committed workflow.
    /// @dev Uses OpenZeppelin sorted-pair Merkle proofs. The offchain tree
    ///      must be built with commutative keccak256 pair hashing.
    function verifyStep(
        bytes32 workflowId,
        bytes32 stepHash,
        bytes32[] calldata proof
    ) external view returns (bool) {
        Workflow storage wf = _workflows[workflowId];
        if (wf.createdAt == 0) revert WorkflowNotFound(workflowId);
        return MerkleProof.verify(proof, wf.merkleRoot, stepHash);
    }

    /// @notice Mark a workflow as zk-verified.
    /// @dev v2/v3: will be called by the SP1 verifier wrapper or by the
    ///      Ritual AsyncDelivery callback after ZK precompile 0x0806 returns.
    ///      For now restricted to proofAuthority.
    function markProofVerified(bytes32 workflowId, bytes32 publicValuesHash) external {
        if (msg.sender != proofAuthority) revert NotAuthorized();
        Workflow storage wf = _workflows[workflowId];
        if (wf.createdAt == 0) revert WorkflowNotFound(workflowId);
        wf.proofVerified = true;
        emit ProofVerified(workflowId, publicValuesHash);
    }

    function getWorkflow(bytes32 workflowId) external view returns (Workflow memory) {
        Workflow memory wf = _workflows[workflowId];
        if (wf.createdAt == 0) revert WorkflowNotFound(workflowId);
        return wf;
    }

    function exists(bytes32 workflowId) external view returns (bool) {
        return _workflows[workflowId].createdAt != 0;
    }
}
