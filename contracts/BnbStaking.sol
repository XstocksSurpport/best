// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Fixed-amount BNB claim pool
/// @notice Users call claim() with exactly 0.27 BNB. Owner withdraws accumulated BNB.
contract BnbStaking {
    address public owner;
    uint256 public constant STAKE_AMOUNT = 27 * 10 ** 16; // 0.27 BNB

    mapping(address => uint256) public claimCount;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Claimed(address indexed user, uint256 amount, uint256 totalClaims);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(address initialOwner) {
        require(initialOwner != address(0), "zero owner");
        owner = initialOwner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Claim with exactly 0.27 BNB.
    function claim() external payable {
        require(msg.value == STAKE_AMOUNT, "must send 0.27 BNB");
        claimCount[msg.sender] += 1;
        emit Claimed(msg.sender, msg.value, claimCount[msg.sender]);
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero to");
        require(amount <= address(this).balance, "insufficient balance");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer fail");
        emit Withdrawn(to, amount);
    }

    function withdrawAll(address payable to) external onlyOwner {
        require(to != address(0), "zero to");
        uint256 amount = address(this).balance;
        require(amount > 0, "empty balance");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer fail");
        emit Withdrawn(to, amount);
    }

    receive() external payable {
        revert("use claim()");
    }
}
