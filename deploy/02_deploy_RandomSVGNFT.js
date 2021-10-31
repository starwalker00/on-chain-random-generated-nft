const fs = require('fs')
let { networkConfig } = require('../helper-hardhat-config')

module.exports = async ({
    getNamedAccounts,
    deployments,
    getChainId
}) => {

    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = await getChainId()
    let linkTokenAddress
    let vrfCoordinatorAddress

    if (chainId == 31337) {
        let linkToken = await get('LinkToken')
        let VRFCoordinatorMock = await get('VRFCoordinatorMock')
        linkTokenAddress = linkToken.address
        vrfCoordinatorAddress = VRFCoordinatorMock.address
        additionalMessage = " --linkaddress " + linkTokenAddress
    } else {
        linkTokenAddress = networkConfig[chainId]['linkToken']
        vrfCoordinatorAddress = networkConfig[chainId]['vrfCoordinator']
    }
    const keyHash = networkConfig[chainId]['keyHash']
    const fee = networkConfig[chainId]['fee']
    args = [vrfCoordinatorAddress, linkTokenAddress, keyHash, fee]
    log("----------------------------------------------------")
    const RandomSVGNFT = await deploy('RandomSVGNFT', {
        from: deployer,
        args: args,
        log: true
    })    
    log(`You have deployed a RandomSVGNFT contract to ${RandomSVGNFT.address}`)
    const networkName = networkConfig[chainId]['name']
    log(`Verify with:\n \tnpx hardhat verify --network ${networkName} ${RandomSVGNFT.address} ${args.toString().replace(/,/g, " ")}`)
    const RandomSVGNFTContract = await hre.ethers.getContractFactory('RandomSVGNFT')
    const accounts = await hre.ethers.getSigners()
    const signer = accounts[0]
        // return an instance of contract which act on behalf of signer    
    const RandomSVGNFTContractInstance = new hre.ethers.Contract(RandomSVGNFT.address, RandomSVGNFTContract.interface, signer)

    // fund with LINK
    const fundAmount = networkConfig[chainId]['fundAmount']
    const linkTokenContract = await hre.ethers.getContractFactory("LinkToken")
        // return an instance of contract which act on behalf of signer
    const linkTokenContractInstance = new hre.ethers.Contract(linkTokenAddress, linkTokenContract.interface, signer)
        // transfer fundAmount of LINK from signer to RandomSVGNFT contract, needed to call ChainLink VRF from Contract
    let fund_tx = await linkTokenContractInstance.transfer(RandomSVGNFT.address, fundAmount)
    await fund_tx.wait(1)
    log("Let's create an NFT now!")
    // create RandomSVGNFT with tokenId of 0
    create_tx = await RandomSVGNFTContractInstance.create()
    let receipt = await create_tx.wait(1)
    // console.log(JSON.stringify(receipt.events))
    let tokenId = receipt.events[3].topics[2]
    // ---
    // create RandomSVGNFT with tokenId of 1
    // create_tx = await RandomSVGNFTContractInstance.create()
    // let receipt1 = await create_tx.wait(1)
    // let tokenId1 = receipt1.events[3].topics[2]
    // console.log(tokenId1)
    // ---
    log(`You've made your NFT! This is tokenId ${tokenId}`)
    log("Let's wait for the Chainlink VRF node to respond...")
    if (chainId != 31337) {
        await new Promise(r => setTimeout(r, 180000))
        log(`Now let's finsih the mint...`)
        tx = await RandomSVGNFTContractInstance.finishMint(tokenId)
        await tx.wait(1)
        log(`You can view the tokenURI here ${await RandomSVGNFTContractInstance.tokenURI(tokenId)}`)
    } else {
        const VRFCoordinatorMock = await deployments.get('VRFCoordinatorMock')
        vrfCoordinator = await hre.ethers.getContractAt('VRFCoordinatorMock', VRFCoordinatorMock.address, signer)
        let transactionResponse = await vrfCoordinator.callBackWithRandomness(receipt.logs[3].topics[1], 77777, RandomSVGNFTContractInstance.address)
        await transactionResponse.wait(1)
        log(`Now let's finsih the mint...`)
        tx = await RandomSVGNFTContractInstance.finishMint(tokenId)
        await tx.wait(1)
        log(`You can view the tokenURI here ${await RandomSVGNFTContractInstance.tokenURI(0)}`)
    }
}

module.exports.tags = ['all', 'rsvg', 'rsvglive']