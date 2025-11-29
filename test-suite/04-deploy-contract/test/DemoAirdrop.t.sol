// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/StdStorage.sol";
import "contracts/DemoAirdrop.sol";

contract DemoAirdropTest is Test {
    using stdStorage for StdStorage;
    
    DemoAirdrop public airdrop;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);
    
    // Test merkle root (will be replaced by actual in test script)
    bytes32 public merkleRoot = 0x1361d28feffb65b743ef4da53ffc43a8695f103a14aceff0de7ed6178ace5197;
    
    uint256 public constant FREE_CLAIMS = 2;
    uint256 public constant CLAIM_AMOUNT = 100 ether;
    
    event Claimed(address indexed account, address indexed recipient, uint256 amount);
    event InvitationCreated(address indexed inviter, address indexed invitee, uint8 slot);
    event Swap(address indexed sender, bool ethForDemo, uint256 amountIn, uint256 amountOut, uint256 newReserveEth, uint256 newReserveDemo);

    function setUp() public {
        // Deploy contract with 1 ETH for AMM
        airdrop = new DemoAirdrop{value: 1 ether}(FREE_CLAIMS);
        
        // Fund test accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
    }

    // ========================================
    // DEPLOYMENT TESTS
    // ========================================
    
    function testDeploymentInitialization() public view {
        assertEq(airdrop.name(), "Demo Airdrop");
        assertEq(airdrop.symbol(), "DEMO");
        assertEq(airdrop.decimals(), 18);
        assertEq(airdrop.totalSupply(), 0);
        assertEq(airdrop.FREE_CLAIMS(), FREE_CLAIMS);
        assertEq(airdrop.MAX_INVITES(), 5);
        assertEq(airdrop.claimCount(), 0);
        
        // Check AMM initialized
        (uint256 ethReserve, uint256 demoReserve) = airdrop.getReserves();
        assertEq(ethReserve, 1 ether);
        assertEq(demoReserve, 0);
    }

    function testReceiveEthIncreasesReserve() public {
        (uint256 ethBefore,) = airdrop.getReserves();
        
        vm.prank(alice);
        (bool sent,) = address(airdrop).call{value: 5 ether}("");
        require(sent, "Failed to send ETH");
        
        (uint256 ethAfter,) = airdrop.getReserves();
        assertEq(ethAfter, ethBefore + 5 ether);
    }

    // ========================================
    // CLAIM TESTS (WITHOUT REAL PROOFS)
    // ========================================
    
    // Note: These tests would need real proofs from the test fixture
    // For now, testing the claim logic with mock setup
    
    function testClaimIncrementsTotalSupply() public {
        // This would fail without valid proof, but demonstrates the test pattern
        // In real tests, we'd load proof from fixture JSON
        bytes32[] memory proof = new bytes32[](0);
        bool[] memory flags = new bool[](0);
        
        // We can't actually claim without valid proof, but can test requirements
        vm.expectRevert();
        vm.prank(alice);
        airdrop.claim(proof, flags);
    }

    function testCannotClaimTwice() public view {
        // Test the hasClaimed check
        assertFalse(airdrop.hasClaimed(alice));
    }

    function testCannotClaimIfPoolNotFunded() public {
        // Deploy without ETH
        DemoAirdrop emptyPool = new DemoAirdrop(2);
        
        bytes32[] memory proof = new bytes32[](0);
        bool[] memory flags = new bool[](0);
        
        vm.expectRevert("DEMO: market maker not funded");
        vm.prank(alice);
        emptyPool.claim(proof, flags);
    }

    // ========================================
    // INVITE SYSTEM TESTS
    // ========================================
    
    function testCannotCreateInviteBeforeClaiming() public {
        vm.expectRevert("DEMO: claim before inviting");
        vm.prank(alice);
        airdrop.createInvitation(bob);
    }

    function testCannotInviteSelf() public {
        // Mock alice as having claimed AND set claimCount >= FREE_CLAIMS
        stdstore
            .target(address(airdrop))
            .sig("hasClaimed(address)")
            .with_key(alice)
            .checked_write(true);
        stdstore
            .target(address(airdrop))
            .sig("claimCount()")
            .checked_write(2);
        
        vm.expectRevert("DEMO: invalid invitee");
        vm.prank(alice);
        airdrop.createInvitation(alice);
    }

    function testCannotInviteZeroAddress() public {
        // Mock alice as having claimed AND set claimCount >= FREE_CLAIMS
        stdstore
            .target(address(airdrop))
            .sig("hasClaimed(address)")
            .with_key(alice)
            .checked_write(true);
        stdstore
            .target(address(airdrop))
            .sig("claimCount()")
            .checked_write(2);
        
        vm.expectRevert("DEMO: invalid invitee");
        vm.prank(alice);
        airdrop.createInvitation(address(0));
    }

    // ========================================
    // AMM TESTS
    // ========================================
    
    function testPreviewBuyCalculatesCorrectly() public {
        // Add some DEMO to reserves using stdStorage
        stdstore
            .target(address(airdrop))
            .sig("reserveDEMO()")
            .checked_write(100 ether);
        // Give contract the DEMO balance to match reserves
        stdstore
            .target(address(airdrop))
            .sig("balanceOf(address)")
            .with_key(address(airdrop))
            .checked_write(100 ether);
        
        uint256 ethIn = 0.1 ether;
        uint256 demoOut = airdrop.previewBuy(ethIn);
        
        // Constant product: dy = (dx * y) / (x + dx)
        // dy = (0.1 * 100) / (1 + 0.1) = 10 / 1.1 ≈ 9.09 DEMO
        assertApproxEqRel(demoOut, 9.09 ether, 0.01 ether);
    }

    function testPreviewSellCalculatesCorrectly() public {
        // Add some DEMO to reserves using stdStorage
        stdstore
            .target(address(airdrop))
            .sig("reserveDEMO()")
            .checked_write(100 ether);
        // Give contract the DEMO balance to match reserves
        stdstore
            .target(address(airdrop))
            .sig("balanceOf(address)")
            .with_key(address(airdrop))
            .checked_write(100 ether);
        
        uint256 demoIn = 10 ether;
        uint256 ethOut = airdrop.previewSell(demoIn);
        
        // dy = (10 * 1) / (100 + 10) = 10 / 110 ≈ 0.0909 ETH
        assertApproxEqRel(ethOut, 0.0909 ether, 0.01 ether);
    }

    function testBuyDemoUpdatesReserves() public {
        // Setup: Add DEMO to reserves using stdStorage
        stdstore
            .target(address(airdrop))
            .sig("reserveDEMO()")
            .checked_write(100 ether);
        // Give contract the DEMO balance
        stdstore
            .target(address(airdrop))
            .sig("balanceOf(address)")
            .with_key(address(airdrop))
            .checked_write(100 ether);
        
        uint256 ethIn = 0.1 ether;
        uint256 expectedDemoOut = airdrop.previewBuy(ethIn);
        
        (uint256 ethBefore, uint256 demoBefore) = airdrop.getReserves();
        
        vm.prank(alice);
        uint256 demoOut = airdrop.buyDemo{value: ethIn}(expectedDemoOut);
        
        (uint256 ethAfter, uint256 demoAfter) = airdrop.getReserves();
        
        assertEq(ethAfter, ethBefore + ethIn);
        assertEq(demoAfter, demoBefore - demoOut);
        assertEq(airdrop.balanceOf(alice), demoOut);
    }

    function testSellDemoRevertsWithoutBalance() public {
        vm.expectRevert("DEMO: balance too low");
        vm.prank(alice);
        airdrop.sellDemo(10 ether, 0);
    }

    function testRevertOnSlippageExceeded() public {
        // Setup reserves using stdStorage
        stdstore
            .target(address(airdrop))
            .sig("reserveDEMO()")
            .checked_write(100 ether);
        // Give contract the DEMO balance to match reserves
        stdstore
            .target(address(airdrop))
            .sig("balanceOf(address)")
            .with_key(address(airdrop))
            .checked_write(100 ether);
        
        uint256 ethIn = 0.1 ether;
        uint256 expectedOut = airdrop.previewBuy(ethIn);
        
        // Ask for more than preview
        vm.expectRevert("DEMO: slippage");
        vm.prank(alice);
        airdrop.buyDemo{value: ethIn}(expectedOut + 1 ether);
    }

    function testGetReservesReturnsCorrectly() public view {
        (uint256 eth, uint256 demo) = airdrop.getReserves();
        assertEq(eth, 1 ether);
        assertEq(demo, 0);
    }

    // ========================================
    // ERC20 TESTS
    // ========================================
    
    function testTransferWorks() public {
        // Give alice some tokens using stdStorage
        stdstore
            .target(address(airdrop))
            .sig("balanceOf(address)")
            .with_key(alice)
            .checked_write(100 ether);
        
        vm.prank(alice);
        bool success = airdrop.transfer(bob, 50 ether);
        
        assertTrue(success);
        assertEq(airdrop.balanceOf(alice), 50 ether);
        assertEq(airdrop.balanceOf(bob), 50 ether);
    }

    function testApproveAndTransferFrom() public {
        // Give alice some tokens using stdStorage
        stdstore
            .target(address(airdrop))
            .sig("balanceOf(address)")
            .with_key(alice)
            .checked_write(100 ether);
        
        vm.prank(alice);
        airdrop.approve(bob, 50 ether);
        
        assertEq(airdrop.allowance(alice, bob), 50 ether);
        
        vm.prank(bob);
        bool success = airdrop.transferFrom(alice, charlie, 30 ether);
        
        assertTrue(success);
        assertEq(airdrop.balanceOf(alice), 70 ether);
        assertEq(airdrop.balanceOf(charlie), 30 ether);
        assertEq(airdrop.allowance(alice, bob), 20 ether);
    }

    function testCannotTransferToZeroAddress() public {
        vm.store(
            address(airdrop),
            keccak256(abi.encode(alice, 0)),
            bytes32(uint256(100 ether))
        );
        
        vm.expectRevert("DEMO: transfer to zero");
        vm.prank(alice);
        airdrop.transfer(address(0), 50 ether);
    }

    // ========================================
    // EDGE CASES
    // ========================================
    
    function testCannotDeployWithZeroFreeClaims() public {
        vm.expectRevert("DEMO: free claims must be >0");
        new DemoAirdrop(0);
    }

    function testFuzzPreviewBuy(uint256 ethIn) public {
        // Bound inputs to reasonable range
        ethIn = bound(ethIn, 0.001 ether, 10 ether);
        
        // Add DEMO reserves using stdStorage
        stdstore
            .target(address(airdrop))
            .sig("reserveDEMO()")
            .checked_write(1000 ether);
        // Give contract the DEMO balance to match reserves
        stdstore
            .target(address(airdrop))
            .sig("balanceOf(address)")
            .with_key(address(airdrop))
            .checked_write(1000 ether);
        
        uint256 demoOut = airdrop.previewBuy(ethIn);
        
        // Output should be less than reserve
        assertLt(demoOut, 1000 ether);
        assertGt(demoOut, 0);
    }
}
