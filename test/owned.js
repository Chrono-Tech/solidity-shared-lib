const Owned = artifacts.require("StubOwned")
const Token = artifacts.require("StubToken")

const Reverter = require("./helpers/reverter")
const eventHelpers = require("./helpers/eventsHelper")
const utils = require("./helpers/utils")

contract("Owned", function (accounts) {
	const reverter = new Reverter(web3)

	const users = {
		contractOwner: accounts[0],
		user1: accounts[1],
		user2: accounts[2],
		user3: accounts[3],
		user4: accounts[4],
	}

	const contracts = {
		owned: null,
		token: null,
	}

	const getEthBalance = addr => new Promise((resolve, reject) => {
		web3.eth.getBalance(addr, (e, b) => (e === undefined || e === null) ? resolve(b) : reject(e))
	})

	const getTx = hash => new Promise((resolve, reject) => {
		web3.eth.getTransaction(hash, (e, tx) => (e === undefined || e === null) ? resolve(tx) : reject(e))
	})

	const getTxReceipt = hash => new Promise((resolve, reject) => {
		web3.eth.getTransactionReceipt(hash, (e, tx) => (e === undefined || e === null) ? resolve(tx) : reject(e))
	})

	const getTxExpences = async hash => {
		const fullTx = await getTx(hash)
		const receiptTx = await getTxReceipt(hash)

		return web3.toBigNumber(fullTx.gasPrice).mul(web3.toBigNumber(receiptTx.gasUsed))
	}

	const sendEth = async ({ from, to, value, }) => {
		return new Promise((resolve, reject) => {
			web3.eth.sendTransaction({ from: from, to: to, value: value, }, (e, txHash) => (e === undefined || e === null) ? resolve(txHash) : reject(e))
		})
	}


	before("setup", async () => {
		await reverter.promisifySnapshot()

		contracts.owned = await Owned.new({ from: users.contractOwner, })
		contracts.token = await Token.new({ from: users.contractOwner, })

		await reverter.promisifySnapshot()
	})

	after(async () => {
		await reverter.promisifyRevert(0)
	})

	context("ownership", () => {

		context("by change/claim", () => {

			after(async () => {
				await reverter.promisifyRevert()
			})

			it("contract owner should be a message sender", async () => {
				assert.equal(await contracts.owned.contractOwner(), users.contractOwner)
			})

			it("should NOT be allowed to change ownership by non-owner", async () => {
				assert.isFalse(await contracts.owned.changeContractOwnership.call(users.user1, { from: users.user1, }))

				await contracts.owned.changeContractOwnership(users.user1, { from: users.user1, })
				assert.equal(await contracts.owned.contractOwner(), users.contractOwner)
			})

			it("should NOT allow to change an owner to 0x0 address", async () => {
				assert.isFalse(await contracts.owned.changeContractOwnership.call(utils.zeroAddress, { from: users.contractOwner, }))

				await contracts.owned.changeContractOwnership(utils.zeroAddress, { from: users.contractOwner, })
				assert.equal(await contracts.owned.contractOwner(), users.contractOwner)
			})

			it("should be allowed to change ownership by an owner", async () => {
				assert.isTrue(await contracts.owned.changeContractOwnership.call(users.user1, { from: users.contractOwner, }))

				await contracts.owned.changeContractOwnership(users.user1, { from: users.contractOwner, })
				assert.equal(await contracts.owned.pendingContractOwner(), users.user1)
			})

			it("should NOT be allowed to claim ownership by not a future owner", async () => {
				assert.isFalse(await contracts.owned.claimContractOwnership.call({ from: users.user2, }))

				await contracts.owned.claimContractOwnership({ from: users.user2, })
				assert.equal(await contracts.owned.contractOwner(), users.contractOwner)
			})

			it("should be allowed to claim ownership by future owner", async () => {
				assert.isTrue(await contracts.owned.claimContractOwnership.call({ from: users.user1, }))

				const tx = await contracts.owned.claimContractOwnership({ from: users.user1, })
				assert.equal(await contracts.owned.pendingContractOwner(), 0)
				assert.equal(await contracts.owned.contractOwner(), users.user1)
				{
					const event = (await eventHelpers.findEvent([contracts.owned,], tx, "OwnershipTransferred"))[0]
					assert.isDefined(event)
					assert.equal(event.args.previousOwner, users.contractOwner)
					assert.equal(event.args.newOwner, users.user1)
				}
			})
		})

		context("by transferOwnership", () => {

			after(async () => {
				await reverter.promisifyRevert()
			})

			it("should have original contract owner", async () => {
				assert.equal(await contracts.owned.contractOwner(), users.contractOwner)
			})

			it("should NOT allow to transfer ownership by a non contract owner", async () => {
				assert.isFalse(await contracts.owned.transferOwnership.call(users.user1, { from: users.user1, }))

				await contracts.owned.transferOwnership(users.user1, { from: users.user1, })
				assert.equal(await contracts.owned.contractOwner(), users.contractOwner)
			})

			it("should NOT allow to transfer ownership to a 0x0 address", async () => {
				assert.isFalse(await contracts.owned.transferOwnership.call(utils.zeroAddress, { from: users.contractOwner, }))

				await contracts.owned.transferOwnership(utils.zeroAddress, { from: users.contractOwner, })
				assert.equal(await contracts.owned.contractOwner(), users.contractOwner)
			})

			it("should allow to change ownership by other approace with setting pending owner", async () => {
				await contracts.owned.changeContractOwnership(users.user3, { from: users.contractOwner, })
				assert.equal(
					await contracts.owned.pendingContractOwner(),
					users.user3
				)
			})

			it("should allow to transfer ownership by contract owner", async () => {
				assert.isTrue(await contracts.owned.transferOwnership.call(users.user1, { from: users.contractOwner, }))

				const tx = await contracts.owned.transferOwnership(users.user1, { from: users.contractOwner, })
				assert.equal(await contracts.owned.contractOwner(), users.user1)
				{
					const event = (await eventHelpers.findEvent([contracts.owned,], tx, "OwnershipTransferred"))[0]
					assert.isDefined(event)
					assert.equal(event.args.previousOwner, users.contractOwner)
					assert.equal(event.args.newOwner, users.user1)
				}
			})

			it("should NOT allow to claim ownership after made transfer operation", async () => {
				assert.isFalse(await contracts.owned.claimContractOwnership.call())
				assert.equal(
					await contracts.owned.pendingContractOwner(),
					utils.zeroAddress
				)
			})
		})
	})

	context("tokens", () => {

		it("should NOT have tokens on owned account", async () => {
			assert.equal(
				(await contracts.token.balanceOf.call(contracts.owned.address)).toString(16),
				'0'
			)
		})

		it("should NOT perform transfer with zero balances", async () => {
			const beforeBalanceUser = await contracts.token.balanceOf.call(users.contractOwner)
			const beforeBalanceOwned = await contracts.token.balanceOf.call(contracts.token.address)

			const tx = await contracts.owned.withdrawTokens([contracts.token.address,], { from: users.contractOwner, })
			{
				const event = (await eventHelpers.findEvent([contracts.token,], tx, "Transfer"))[0]
				assert.isUndefined(event)
			}

			const afterBalanceUser = await contracts.token.balanceOf.call(users.contractOwner)
			const afterBalanceOwned = await contracts.token.balanceOf.call(contracts.token.address)
			assert.equal(
				beforeBalanceUser.toString(16),
				afterBalanceUser.toString(16)
			)
			assert.equal(
				beforeBalanceOwned.toString(16),
				afterBalanceOwned.toString(16)
			)
		})

		describe("on owned account", () => {
			const sendAmount = web3.toBigNumber("1444")

			before(async () => {
				await contracts.token.transfer(contracts.owned.address, sendAmount, { from: users.contractOwner, })
			})

			after(async () => {
				await reverter.promisifyRevert()
			})

			it("should have sent tokens on owned account", async () => {
				assert.equal(
					(await contracts.token.balanceOf.call(contracts.owned.address)).toString(16),
					sendAmount.toString(16)
				)
			})

			it("should NOT be able to withdraw by non-contract owner", async () => {
				const beforeBalanceUser = await contracts.token.balanceOf.call(users.user2)
				const beforeBalanceOwned = await contracts.token.balanceOf.call(contracts.owned.address)

				const tx = await contracts.owned.withdrawTokens([contracts.token.address,], { from: users.user2, })
				{
					const event = (await eventHelpers.findEvent([contracts.token,], tx, "Transfer"))[0]
					assert.isUndefined(event)
				}

				const afterBalanceUser = await contracts.token.balanceOf.call(users.user2)
				const afterBalanceOwned = await contracts.token.balanceOf.call(contracts.owned.address)
				assert.equal(
					beforeBalanceUser.toString(16),
					afterBalanceUser.toString(16)
				)
				assert.equal(
					beforeBalanceOwned.toString(16),
					afterBalanceOwned.toString(16)
				)
			})

			it("should be able to withdraw by contract owner", async () => {
				const beforeBalanceUser = await contracts.token.balanceOf.call(users.contractOwner)
				const beforeBalanceOwned = await contracts.token.balanceOf.call(contracts.owned.address)

				const tx = await contracts.owned.withdrawTokens([contracts.token.address,], { from: users.contractOwner, })
				{
					const event = (await eventHelpers.findEvent([contracts.token,], tx, "Transfer"))[0]
					assert.isDefined(event)
					assert.equal(event.args.from, contracts.owned.address)
					assert.equal(event.args.to, users.contractOwner)
					assert.equal(parseInt(event.args.value).toString(16), sendAmount.toString(16))
				}

				const afterBalanceUser = await contracts.token.balanceOf.call(users.contractOwner)
				const afterBalanceOwned = await contracts.token.balanceOf.call(contracts.owned.address)
				assert.equal(
					beforeBalanceUser.add(sendAmount).toString(16),
					afterBalanceUser.toString(16)
				)
				assert.equal(
					beforeBalanceOwned.sub(sendAmount).toString(16),
					afterBalanceOwned.toString(16)
				)
			})
		})
	})

	context("ethers", () => {
		const etherAmount = web3.toBigNumber(web3.toWei("10000", "gwei"))

		it("should NOT have any ether at the beginning", async () => {
			assert.equal(
				(await getEthBalance(contracts.owned.address)).toString(16),
				'0'
			)
		})

		it("should NOT transfer any ether when call withdraw eth", async () => {
			const beforeEthUser = await getEthBalance(users.contractOwner)

			const tx = await contracts.owned.withdrawEther({ from: users.contractOwner, })
			const txExpences = await getTxExpences(tx.tx)

			const afterEthUser = await getEthBalance(users.contractOwner)
			assert.equal(
				beforeEthUser.sub(txExpences).toString(16),
				afterEthUser.toString(16)
			)
		})

		describe("on owned account", () => {

			before(async () => {
				await sendEth({ value: etherAmount, to: contracts.owned.address, from: users.contractOwner, })
			})

			after(async () => {
				await reverter.promisifyRevert()
			})

			it("should have some eth on owned", async () => {
				assert.equal(
					(await getEthBalance(contracts.owned.address)).toString(16),
					etherAmount.toString(16)
				)
			})

			it("should NOT allow to withdraw eth to a non contract owner", async () => {
				const caller = users.user2
				const beforeEthUser = await getEthBalance(caller)
				const beforeEthOwned = await getEthBalance(contracts.owned.address)

				const tx = await contracts.owned.withdrawEther({ from: caller, })
				const txExpences = await getTxExpences(tx.tx)

				const afterEthUser = await getEthBalance(caller)
				const afterEthOwned = await getEthBalance(contracts.owned.address)
				assert.equal(
					beforeEthUser.sub(txExpences).toString(16),
					afterEthUser.toString(16)
				)
				assert.equal(
					beforeEthOwned.toString(16),
					afterEthOwned.toString(16)
				)
			})

			it("should allow to withdraw eth to a contract owner", async () => {
				const caller = users.contractOwner
				const beforeEthUser = await getEthBalance(caller)
				const beforeEthOwned = await getEthBalance(contracts.owned.address)

				const tx = await contracts.owned.withdrawEther({ from: caller, })
				const txExpences = await getTxExpences(tx.tx)

				const afterEthUser = await getEthBalance(caller)
				const afterEthOwned = await getEthBalance(contracts.owned.address)
				assert.equal(
					beforeEthUser.sub(txExpences).add(etherAmount).toString(16),
					afterEthUser.toString(16)
				)
				assert.equal(
					beforeEthOwned.sub(etherAmount).toString(16),
					afterEthOwned.toString(16)
				)
			})
		})

	})

})
