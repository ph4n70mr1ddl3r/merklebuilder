// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Demo Airdrop (ERC20 with Merkle-claim minting)
/// @notice Tokens start at zero supply and are minted only when eligible addresses claim.
/// @dev Merkle root generated from `merkledb/layer26.bin` in this repo. Leaves are
/// `keccak256(abi.encodePacked(address))` and branches preserve left/right ordering
/// (no sorting). Proofs therefore need a sibling-direction flag for every node.
contract DemoAirdrop {
    // --- ERC20 metadata ---
    string public constant name = "Demo Airdrop";
    string public constant symbol = "DEMO";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    uint256 public constant CLAIM_AMOUNT = 100 ether; // 100 DEMO per eligible address

    // Merkle root over the address set produced by `txt_to_bin` (see merkledb folder).
    bytes32 public constant MERKLE_ROOT =
        0x8bfe0b0736a43e4820cdb91c9222611b6fe7c3ccfd06bf899280c55a18a8f81d;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public hasClaimed;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Claimed(address indexed account, uint256 amount);

    // --- ERC20 ---
    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "DEMO: allowance exceeded");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
            emit Approval(from, msg.sender, allowed - value);
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "DEMO: transfer to zero");
        uint256 fromBal = balanceOf[from];
        require(fromBal >= value, "DEMO: balance too low");
        unchecked {
            balanceOf[from] = fromBal - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        require(to != address(0), "DEMO: mint to zero");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    // --- Merkle airdrop ---
    /// @notice Claim once using an inclusion proof for `msg.sender`.
    /// @param proof Hashes from leaf to root.
    /// @param proofFlags `true` if the sibling at the same index in `proof` is the left node.
    function claim(bytes32[] calldata proof, bool[] calldata proofFlags) external {
        address account = msg.sender;
        require(!hasClaimed[account], "DEMO: already claimed");
        require(proof.length == proofFlags.length, "DEMO: proof length mismatch");

        bytes32 leaf = keccak256(abi.encodePacked(account));
        require(_verify(leaf, proof, proofFlags), "DEMO: invalid proof");

        hasClaimed[account] = true;
        _mint(account, CLAIM_AMOUNT);
        emit Claimed(account, CLAIM_AMOUNT);
    }

    /// @notice View helper to validate a proof off-chain or before claiming.
    function isEligible(address account, bytes32[] calldata proof, bool[] calldata proofFlags)
        external
        pure
        returns (bool)
    {
        if (proof.length != proofFlags.length) return false;
        return _verify(keccak256(abi.encodePacked(account)), proof, proofFlags);
    }

    function _verify(bytes32 leaf, bytes32[] calldata proof, bool[] calldata proofFlags)
        internal
        pure
        returns (bool)
    {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; ++i) {
            computed = proofFlags[i]
                ? keccak256(abi.encodePacked(proof[i], computed)) // sibling on the left
                : keccak256(abi.encodePacked(computed, proof[i])); // sibling on the right
        }
        return computed == MERKLE_ROOT;
    }
}
