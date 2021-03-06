require("dotenv").config({ path: '.env.development.local' })
const RINKEBY_URL = process.env.RINKEBY_URL
const MNEMONIC = process.env.MNEMONIC
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
// require("hardhat-gas-reporter");
// require("solidity-coverage");
require('hardhat-deploy');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
        {
            version: "0.8.4"
        },
        {
            version: "0.7.0"
        },
        {
            version: "0.6.6"
        },
        {
            version: "0.4.24"
        }
    ]
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: {
        default: 0, // here this will by default take the first account as deployer
        // 1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        // 4: '0xA296a3d5F026953e17F472B497eC29a5631FB51B', // but for rinkeby it will be a specific address
        // "goerli": '0x84b9514E013710b9dD0811c9Fe46b837a4A0d8E0', //it can also specify a specific netwotk name (specified in hardhat.config.js)
    },
  },
  networks: {
    hardhat: { },
    rinkeby: {
      url: RINKEBY_URL || "",
      accounts: {
        mnemonic: MNEMONIC !== undefined ? MNEMONIC : [],
      },
    },
  },
  // },
  // gasReporter: {
  //   enabled: process.env.REPORT_GAS !== undefined,
  //   currency: "USD",
  // },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};
