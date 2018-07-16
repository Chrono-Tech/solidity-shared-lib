/**
* Copyright 2017–2018, LaborX PTY
* Licensed under the AGPL Version 3 license.
*/

pragma solidity ^0.4.23;


import "../ERC20Interface.sol";


contract StubToken is ERC20Interface {

    uint256 internal totalTokens;
    mapping (address => uint256) internal balances;
    mapping (address => mapping (address => uint256)) internal allowances;

    constructor() public {
        symbol = "STUB";
        totalTokens = 2**128 + 10;
        balances[msg.sender] = totalTokens;
    }

    /*
    *  Public functions
    */
    /// @dev Transfers sender's tokens to a given address. Returns success
    /// @param to Address of token receiver
    /// @param value Number of tokens to transfer
    /// @return Was transfer successful?
    function transfer(address to, uint256 value)
    public
    returns (bool)
    {
        require(balances[msg.sender] >= value, "Insufficient balance"); 
        require(balances[to] + value > balances[to], "Overflow of receiver");

        balances[msg.sender] -= value;
        balances[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    /// @dev Allows allowed third party to transfer tokens from one address to another. Returns success
    /// @param from Address from where tokens are withdrawn
    /// @param to Address to where tokens are sent
    /// @param value Number of tokens to transfer
    /// @return Was transfer successful?
    function transferFrom(address from, address to, uint256 value)
    public
    returns (bool)
    {
        require(balances[from] >= value, "Insufficient balance"); 
        require(allowances[from][msg.sender] >= value, "Insufficient allowance");
        require(balances[to] + value > balances[to], "Overflow of receiver");
        
        balances[from] -= value;
        allowances[from][msg.sender] -= value;
        balances[to] += value;
        emit Transfer(from, to, value);
        return true;
    }

    /// @dev Sets approved amount of tokens for spender. Returns success
    /// @param spender Address of allowed account
    /// @param value Number of approved tokens
    /// @return Was approval successful?
    function approve(address spender, uint256 value)
    public
    returns (bool)
    {
        allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /// @dev Returns number of allowed tokens for given address
    /// @param owner Address of token owner
    /// @param spender Address of token spender
    /// @return Remaining allowance for spender
    function allowance(address owner, address spender)
    public
    view
    returns (uint256)
    {
        return allowances[owner][spender];
    }

    /// @dev Returns number of tokens owned by given address
    /// @param owner Address of token owner
    /// @return Balance of owner
    function balanceOf(address owner)
    public
    view
    returns (uint256)
    {
        return balances[owner];
    }

    /// @dev Returns total supply of tokens
    /// @return Total supply
    function totalSupply()
    public
    view
    returns (uint256)
    {
        return totalTokens;
    }

    /// @dev Returns decimals of tokens
    /// @return decimals number
    function decimals()
    public
    view
    returns (uint8)
    {
        return 8;
    }
}