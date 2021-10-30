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
    const RandomSVGNFTContract = await ethers.getContractFactory('RandomSVGNFT')
    const accounts = await hre.ethers.getSigners()
    const signer = accounts[0]
    const RandomSVGNFTInstance = new ethers.Contract(RandomSVGNFT.address, RandomSVGNFTContract.interface, signer)
    const networkName = networkConfig[chainId]['name']
    log(`Verify with:\n \tnpx hardhat verify --network ${networkName} ${RandomSVGNFT.address} ${args.toString().replace(/,/g, " ")}`)

}

module.exports.tags = ['all', 'rsvg']