import { Command, Flags } from "@oclif/core";
import { Address } from "viem";
import { getWalletForDynamicAuth } from "../../wallet";
import { saveDynamicWallet } from "../../keystore";

export default class KeyImportDynamic extends Command {
  static description = "Import a wallet from Dynamic authentication";

  static examples = [
    `$ earthfast key import-dynamic --address 0x123... --description "My Dynamic wallet"`,
  ];

  static flags = {
    address: Flags.string({
      char: "a",
      description: "Smart wallet address from Dynamic authentication",
      required: true,
    }),
    description: Flags.string({
      char: "d",
      description: "Description for this wallet",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(KeyImportDynamic);
    const address = flags.address as Address;
    const description = flags.description;

    try {
      // Verify that this is a valid Dynamic-authenticated wallet
      // In a real implementation, you would verify with Dynamic's API
      this.log(`Verifying Dynamic-authenticated wallet at address: ${address}`);
      
      // Get the wallet client to verify it works
      const kernelClient = await getWalletForDynamicAuth(address);
      
      // Save the wallet address and description to the keystore
      this.log(`Saving Dynamic-authenticated wallet to keystore...`);
      
      // In a real implementation, you would include the necessary Dynamic auth data
      const dynamicAuthData = {
        // This would contain the necessary data to reconnect to Dynamic
        // For example, a refresh token or other credentials
        // For now, we'll just include a placeholder
        placeholder: "This would contain Dynamic authentication data",
      };
      
      await saveDynamicWallet(address, description, dynamicAuthData);
      
      this.log(`Dynamic-authenticated wallet imported successfully!`);
      this.log(`Address: ${address}`);
      this.log(`Description: ${description}`);
      this.log(`Smart account address: ${kernelClient.account?.address}`);
      
      this.log(`\nNote: This is a demonstration command. In a real implementation,`);
      this.log(`you would need to integrate with Dynamic's SDK to properly authenticate`);
      this.log(`and store the necessary credentials.`);
    } catch (error) {
      this.error(`Failed to import Dynamic-authenticated wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 