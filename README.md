# Shared smart contracts [![Build Status](https://travis-ci.org/ChronoBank/solidity-shared-lib.svg?branch=master)](https://travis-ci.org/ChronoBank/solidity-shared-lib) [![Coverage Status](https://coveralls.io/repos/github/ChronoBank/solidity-shared-lib/badge.svg?branch=master)](https://coveralls.io/github/ChronoBank/solidity-shared-lib?branch=master)

Part of [LaborX project](https://github.com/ChronoBank). Contains a list of basic smart contracts and interfaces that should be at hands for every developer.

- **ERC20Interface** - describes an interface for ERC20 token standard;
- [**Owned**](#owned) - provides a smart contract that is owned by its creator and allows to transfer an ownership in different ways (immediately or with pending timeout).

## Installation

Organized as npm package this smart contracts could be easily added to a project by

```bash
npm install -s solidity-shared-lib
```

## Usage

Right before you decided to use them add this library to package dependencies and import any contract according to this pattern, for example:

```javascript
import "solidity-shared-lib/contracts/Owned.sol";
```

## Details

### Owned

This smart contract besides pinning a contract owner also allows to withdraw any tokens or ether that were mistakenly transferred to a contract (only for contract owner).
