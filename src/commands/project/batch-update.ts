import { Command, Flags } from "@oclif/core";
import { getWalletForAddress, batchProjectOperations, waitForUserOperationReceipt } from "../../wallet";
import { NetworkName, NetworkNames } from "../../networks";
import { encodeFunctionData } from "viem";

export default class BatchUpdate extends Command {
  static description = "Batch update multiple projects in a single transaction";

  static examples = [
    `$ earthfast project batch-update --network testnet-sepolia-staging --wallet 0x123... --password mypassword --projects 0xproj1,0xproj2 --metadata '{"key":"value"}'`,
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
    projects: Flags.string({
      char: "j",
      description: "Comma-separated list of project IDs",
      required: true,
    }),
    metadata: Flags.string({
      char: "m",
      description: "Metadata to set for all projects (JSON string)",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(BatchUpdate);
    const network = flags.network as NetworkName;
    const walletAddress = flags.wallet;
    const password = flags.password;
    const projectIds = flags.projects.split(",").map(id => id.trim());
    const metadata = flags.metadata;

    try {
      // Get the wallet client
      const kernelClient = await getWalletForAddress(walletAddress, password);
      
      // Create an array of function calls for each project
      const functionCalls = projectIds.map(projectId => ({
        functionName: "setProjectMetadata",
        args: [projectId, metadata],
      }));

      // Send the batch operation
      this.log(`Sending batch update for ${projectIds.length} projects...`);
      const userOpHash = await batchProjectOperations(
        kernelClient,
        network,
        functionCalls
      );
      
      this.log(`User operation hash: ${userOpHash}`);
      
      // Wait for the receipt
      this.log("Waiting for transaction to be mined...");
      const receipt = await waitForUserOperationReceipt(kernelClient, userOpHash);
      
      this.log(`Transaction successful! Hash: ${receipt.receipt.transactionHash}`);
      this.log(`Gas used: ${receipt.receipt.gasUsed}`);
      
    } catch (error) {
      this.error(`Failed to batch update projects: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
