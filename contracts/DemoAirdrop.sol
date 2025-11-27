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
        0x1361d28feffb65b743ef4da53ffc43a8695f103a14aceff0de7ed6178ace5197;

    uint8 public constant MAX_INVITES = 5;
    uint256 public constant REFERRAL_REWARD = 1 ether; // 1 DEMO per referral level
    uint256 public immutable FREE_CLAIMS;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public hasClaimed;
    mapping(address => address) public invitedBy; // inviter address (zero if none)
    mapping(address => uint8) public invitesCreated; // invitations created by an address
    struct InvitationSlot {
        address invitee;
        bool used;
    }
    mapping(address => InvitationSlot[MAX_INVITES]) public invitationSlots; // fixed slots per inviter

    uint256 public claimCount;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Claimed(address indexed account, uint256 amount);
    event InvitationCreated(address indexed inviter, address indexed invitee, uint8 slot);
    event InvitationRevoked(address indexed inviter, address indexed invitee, uint8 slot);
    event ReferralPaid(address indexed invitee, address indexed referrer, uint256 amount, uint256 level);

    constructor(uint256 freeClaims_) {
        require(freeClaims_ > 0, "DEMO: free claims must be >0");
        FREE_CLAIMS = freeClaims_;
    }

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
        if (claimCount >= FREE_CLAIMS) {
            require(invitedBy[account] != address(0), "DEMO: invitation required");
        }

        if (invitedBy[account] != address(0)) {
            _markInviteUsed(invitedBy[account], account);
        }
        hasClaimed[account] = true;
        claimCount += 1;
        _mint(account, CLAIM_AMOUNT);
        _payReferrals(account);
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

    /// @notice Create an invitation for another address (max 5 per claimer).
    function createInvitation(address invitee) external {
        require(hasClaimed[msg.sender], "DEMO: claim before inviting");
        require(claimCount >= FREE_CLAIMS, "DEMO: invites locked until free claims filled");
        require(invitee != address(0) && invitee != msg.sender, "DEMO: invalid invitee");
        require(invitedBy[invitee] == address(0), "DEMO: already invited");
        require(!hasClaimed[invitee], "DEMO: invitee already claimed");

        uint8 slot = _findEmptySlot(msg.sender);
        InvitationSlot storage s = invitationSlots[msg.sender][slot];
        s.invitee = invitee;
        s.used = false;
        invitedBy[invitee] = msg.sender;
        invitesCreated[msg.sender] += 1;
        emit InvitationCreated(msg.sender, invitee, slot);
    }

    /// @notice Reclaim an unused invitation slot for a new invitee.
    function revokeInvitation(uint8 slot) external {
        require(slot < MAX_INVITES, "DEMO: invalid slot");
        InvitationSlot storage s = invitationSlots[msg.sender][slot];
        address invitee = s.invitee;
        require(invitee != address(0), "DEMO: slot empty");
        require(!s.used, "DEMO: invite already used");
        require(!hasClaimed[invitee], "DEMO: invitee already claimed");

        invitedBy[invitee] = address(0);
        s.invitee = address(0);
        s.used = false;
        if (invitesCreated[msg.sender] > 0) {
            invitesCreated[msg.sender] -= 1;
        }
        emit InvitationRevoked(msg.sender, invitee, slot);
    }

    /// @notice View helper to return the fixed invitation slots for an inviter.
    function getInvitations(address inviter)
        external
        view
        returns (address[MAX_INVITES] memory invitees, bool[MAX_INVITES] memory used)
    {
        InvitationSlot[MAX_INVITES] storage slots = invitationSlots[inviter];
        for (uint256 i = 0; i < MAX_INVITES; ++i) {
            invitees[i] = slots[i].invitee;
            used[i] = slots[i].used;
        }
    }

    function _payReferrals(address account) internal {
        address referrer = invitedBy[account];
        uint256 level = 1;
        while (referrer != address(0) && level <= 5) {
            _mint(referrer, REFERRAL_REWARD);
            emit ReferralPaid(account, referrer, REFERRAL_REWARD, level);
            referrer = invitedBy[referrer];
            level += 1;
        }
    }

    function _findEmptySlot(address inviter) internal view returns (uint8) {
        InvitationSlot[MAX_INVITES] storage slots = invitationSlots[inviter];
        for (uint8 i = 0; i < MAX_INVITES; ++i) {
            if (slots[i].invitee == address(0)) {
                return i;
            }
        }
        revert("DEMO: no invites left");
    }

    function _markInviteUsed(address inviter, address invitee) internal {
        InvitationSlot[MAX_INVITES] storage slots = invitationSlots[inviter];
        for (uint256 i = 0; i < MAX_INVITES; ++i) {
            InvitationSlot storage s = slots[i];
            if (s.invitee == invitee) {
                s.used = true;
                return;
            }
        }
    }
}
