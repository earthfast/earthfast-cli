import { Command, Flags } from "@oclif/core";
import { getWalletForAddress } from "../../wallet";
import { NetworkName, NetworkNames } from "../../networks";
import { loadAbi, ContractName } from "../../contracts";
import { ethers } from "ethers";

export default class Sign extends Command {
  static description = "Generate an approval signature for deploySite";

  static examples = [
    `$ earthfast key sign --network testnet-sepolia --wallet 0x123... --password mypassword --amount 10 --deadline 1742434970`,
  ];

  static flags = {
    network: Flags.string({
      char: "n",
      description: "Network to use",
      options: NetworkNames,
      default: "testnet-sepolia-staging",
    }),
    wallet: Flags.string({
      char: "w",
      description: "Wallet address to use",
      required: true,
    }),
    password: Flags.string({
      char: "p",
      description: "Wallet password",
      required: true,
    }),
    amount: Flags.string({
      char: "a",
      description: "Amount of USDC to approve",
      required: true,
    }),
    deadline: Flags.string({
      char: "d",
      description: "Deadline timestamp for the signature",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Sign);
    const network = flags.network as NetworkName;
    const walletAddress = flags.wallet;
    const password = flags.password;
    const amount = flags.amount;
    const deadline = parseInt(flags.deadline);

    try {
      // Get the wallet client
      const kernelClient = await getWalletForAddress(walletAddress, password);
      
      // Get the contract info
      const usdcInfo = await loadAbi(network, undefined, "USDC" as ContractName);
      const projectsInfo = await loadAbi(network, undefined, "EarthfastProjects" as ContractName);
      
      // Convert amount to USDC decimals (6)
      const amountInUSDC = ethers.utils.parseUnits(amount, 6);

      // Create the domain separator for EIP-712
      const domain = {
        name: "USD Coin",
        version: "2",
        chainId: kernelClient.chain.id,
        verifyingContract: usdcInfo.address,
      };

      // Create the types for the permit
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      // Get the current nonce
      const nonce = await kernelClient.account.getNonce();

      // Create the permit data
      const permitData = {
        owner: walletAddress,
        spender: projectsInfo.address,
        value: amountInUSDC,
        nonce: nonce,
        deadline: deadline,
      };

      // Sign the permit
      const signature = await kernelClient.account.signTypedData({
        domain,
        types,
        primaryType: "Permit",
        message: permitData,
      });

      // Output the signature and related data for use in deploySite
      this.log("Signature data for deploySite:");
      this.log(JSON.stringify({
        signature,
        deadline,
        amount: amountInUSDC.toString(),
      }, null, 2));

      this.log("\nExample deploySite command:");
      this.log(`earthfast execute --network ${network} --wallet ${walletAddress} --password ${password} --function deploySite --args '[
        {
          "owner": "${walletAddress}",
          "name": "Your Project Name",
          "email": "your@email.com",
          "content": "",
          "checksum": "0x0000000000000000000000000000000000000000000000000000000000000000",
          "metadata": "{}"
        },
        "${walletAddress}",
        1,
        "${amountInUSDC.toString()}",
        {"last": true, "next": true},
        ${deadline},
        "${signature}"
      ]' --contract EarthfastEntrypoint`);

    } catch (error) {
      this.error(`Failed to generate signature: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
