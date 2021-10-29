const fs = require('fs')
let { networkConfig } = require('../helper-hardhat-config')

module.exports = async ({
    getNamedAccounts,
    deployments,
    getChainId
}) => {

    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = await getChainId()

    log("----------------------------------------------------")
    const SVGNFT = await deploy('SVGNFT', {
        from: deployer,
        log: true
    })    
    log(`You have deployed an NFT contract to ${SVGNFT.address}`)
    const SVGNFTContract = await ethers.getContractFactory('SVGNFT')
    const accounts = await hre.ethers.getSigners()
    const signer = accounts[0]
    const svgNFTInstance = new ethers.Contract(SVGNFT.address, SVGNFTContract.interface, signer)
    const networkName = networkConfig[chainId]['name']
    log(`Verify with:\n \tnpx hardhat verify --network ${networkName} ${SVGNFT.address}`)
    log("Let's create an NFT now!")
    let filepath = './image/star.svg'
    let svg = fs.readFileSync(filepath, {encoding: 'utf-8'})
    log(`We will use ${filepath} as our SVG, and this will turn into a tokenURI. `)
    tx = await svgNFTInstance.create(svg)
    await tx.wait(1) // wait for 1 block
    log(`You've made your first NFT!`)
    log(`You can view the tokenURI here ${await svgNFTInstance.tokenURI(0)}`)

}