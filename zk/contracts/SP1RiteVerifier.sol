// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Canonical SP1 verifier gateway interface (deployed by Succinct on
///      most EVM chains; on Ritual, deploy sp1-contracts or use the ZK
///      precompile path instead, see zk/README.md).
interface ISP1Verifier {
    function verifyProof(
        bytes32 programVKey,
        bytes calldata publicValues,
        bytes calldata proofBytes
    ) external view;
}

interface IRite {
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

    function getWorkflow(bytes32 workflowId) external view returns (Workflow memory);

    function markProofVerified(bytes32 workflowId, bytes32 publicValuesHash) external;
}

/// @title SP1RiteVerifier
/// @notice Verifies an SP1 Groth16 proof over a full agent trail and marks
///         the workflow as proof-verified in Rite.
///
///         The guest program (zk/program) commits:
///         abi.encode(workflowId, merkleRoot, reportHash, policyHash)
///
///         A valid proof means: every step hash was recomputed from its
///         preimage fields, steps are chained (input[i] == output[i-1]),
///         roles follow the researcher -> critic -> finalizer policy,
///         timestamps strictly increase, the Merkle root covers exactly
///         these steps, and the final report matches the last output.
///
///         Deployment: deploy this, then Rite.setProofAuthority(this).
contract SP1RiteVerifier {
    ISP1Verifier public immutable sp1Verifier;
    IRite public immutable rite;

    /// @dev vkey of the audit-proof-program ELF; from `cargo run --bin vkey`.
    bytes32 public programVKey;
    address public owner;

    event AuditProofVerified(
        bytes32 indexed workflowId,
        bytes32 merkleRoot,
        bytes32 reportHash
    );

    error NotOwner();
    error PublicValuesMismatch();

    constructor(address verifier, address trail, bytes32 vkey) {
        sp1Verifier = ISP1Verifier(verifier);
        rite = IRite(trail);
        programVKey = vkey;
        owner = msg.sender;
    }

    /// @dev Rotate vkey after rebuilding the guest program.
    function setProgramVKey(bytes32 vkey) external {
        if (msg.sender != owner) revert NotOwner();
        programVKey = vkey;
    }

    /// @notice Verify a trail proof and flip proofVerified on the workflow.
    /// @param publicValues abi.encode(workflowId, merkleRoot, reportHash, policyHash)
    /// @param proofBytes   Groth16 proof from zk/script prove
    function submitProof(bytes calldata publicValues, bytes calldata proofBytes) external {
        // reverts on invalid proof
        sp1Verifier.verifyProof(programVKey, publicValues, proofBytes);

        (
            bytes32 workflowId,
            bytes32 merkleRoot,
            bytes32 reportHash,
            bytes32 policyHash
        ) = abi.decode(publicValues, (bytes32, bytes32, bytes32, bytes32));

        // the proven trail must be exactly the one anchored onchain
        IRite.Workflow memory wf = rite.getWorkflow(workflowId);
        if (
            wf.merkleRoot != merkleRoot ||
            wf.reportHash != reportHash ||
            wf.policyHash != policyHash
        ) revert PublicValuesMismatch();

        rite.markProofVerified(workflowId, keccak256(publicValues));
        emit AuditProofVerified(workflowId, merkleRoot, reportHash);
    }
}
