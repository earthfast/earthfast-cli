import { Flags } from "@oclif/core";
import { createWallet, batchUserOperations, waitForUserOperationReceipt } from "../zeroDevWallet";
import { NetworkName } from "../networks";
import { encodeFunctionData, Address, Abi } from "viem";
import { loadAbi, ContractName } from "../contracts";
import { Wallet } from "ethers";
import { getSigner } from "../helpers";
import { TransactionCommand } from "../base";

export default class Execute extends TransactionCommand {
  static description = "Execute one or more functions on contracts via smart wallet user operation";

  static examples = [
    `$ earthfast execute --network testnet-sepolia-staging --calls '[{"contract":"EarthfastProjects","function":"setProjectMetadata","args":["0xprojectId","{\\"key\\":\\"value\\"}"]}]'`,
    `$ earthfast execute --network testnet-sepolia-staging --calls '[{"contract":"EarthfastProjects","function":"createProject","args":[{"owner":"0xowner","name":"Project Name","email":"email@example.com","content":"ipfs://content","checksum":"0xchecksum","metadata":"{\\"key\\":\\"value\\"}"}]},{"contract":"EarthfastNodes","function":"registerNode","args":["0xnodeId"]}]'`,
  ];

  static flags = {
    calls: Flags.string({
      char: "c",
      description: "Array of function calls as a JSON string. Each call should have contract, function, and args fields.",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Execute);
    const network = flags.network as NetworkName;
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const privateKey = ((signer as Wallet).privateKey);

    // Parse the function calls
    let calls;
    try {
      calls = JSON.parse(flags.calls);
      if (!Array.isArray(calls)) {
        throw new Error("Calls must be an array");
      }
    } catch (error) {
      this.error(`Invalid calls format. Must be a valid JSON array string: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    try {
      // Get the wallet client
      const kernelClient = await createWallet(privateKey);

      // Process each function call
      const operations = await Promise.all(calls.map(async (call) => {
        // Validate call structure
        if (!call.contract || !call.function || !call.args) {
          throw new Error(`Invalid call structure: ${JSON.stringify(call)}`);
        }

        // Get the contract info
        const contractInfo = await loadAbi(network, undefined, call.contract as ContractName);

        // Convert ContractInterface to Abi type for viem compatibility
        const abi = contractInfo.abi as unknown as Abi;

        // Encode the function call
        const callData = encodeFunctionData({
          abi,
          functionName: call.function,
          args: call.args,
        });

        return {
          target: contractInfo.address as `0x${string}`,
          callData,
        };
      }));

      // Send the batch operation
      this.log(`Executing ${calls.length} function calls in a single transaction...`);
      const userOpHash = await batchUserOperations(kernelClient, operations);

      this.log(`User operation hash: ${userOpHash}`);

      // Wait for the receipt
      this.log("Waiting for transaction to be mined...");
      const receipt = await waitForUserOperationReceipt(kernelClient, userOpHash);

      this.log(`Transaction successful! Hash: ${receipt.receipt.transactionHash}`);
      this.log(`Gas used: ${receipt.receipt.gasUsed}`);

    } catch (error) {
      this.error(`Failed to execute functions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
