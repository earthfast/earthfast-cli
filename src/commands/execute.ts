import { Command, Flags } from "@oclif/core";
import { getWalletForAddress, getContractAddress, batchUserOperations, waitForUserOperationReceipt } from "../wallet";
import { NetworkName, NetworkNames } from "../networks";
import { encodeFunctionData, Address, Abi } from "viem";
import { loadAbi, ContractName } from "../contracts";

// TODO: generalize this to take encoded function data as input, and potentially as an array so multiple user operations can be sent in a single transaction
export default class Execute extends Command {
  static description = "Execute a function on a contract via smart wallet user operation";

  static examples = [
    `$ earthfast execute --network testnet-sepolia-staging --wallet 0x123... --password mypassword --function "setProjectMetadata" --args '["0xprojectId", "{\\"key\\":\\"value\\"}"]' --contract EarthfastProjects`,
    `$ earthfast execute --network testnet-sepolia-staging --wallet 0x123... --password mypassword --function "createProject" --args '[{"owner":"0xowner","name":"Project Name","email":"email@example.com","content":"ipfs://content","checksum":"0xchecksum","metadata":"{\\"key\\":\\"value\\"}"}]' --contract EarthfastProjects`,
  ];

// ./bin/dev execute --network testnet-sepolia --wallet 0x183921bD248aEB173312A794cFEf413fDE5bF5Ca --password mypassword --function createProject --args '[{"owner":"0x183921bD248aEB173312A794cFEf413fDE5bF5Ca","name":"Project Name","email":"email@example.com","content":"ipfs://content","checksum":"0x0000000000000000000000000000000000000000000000000000000000000000","metadata":"{}"}]'
// ./bin/dev execute --network testnet-sepolia --wallet 0x183921bD248aEB173312A794cFEf413fDE5bF5Ca --password mypassword --function deploySite --args '[
// {"owner":"0x183921bD248aEB173312A794cFEf413fDE5bF5Ca","name":"Project Name","email":"email@example.com","content":"ipfs://content","checksum":"0x0000000000000000000000000000000000000000000000000000000000000000","metadata":"{}"},
// 0x183921bD248aEB173312A794cFEf413fDE5bF5Ca, 1, "4.000000000000000000", {last: true, next: true}, <DEADLINE>, <SIGNATURE>
// ]'

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
    function: Flags.string({
      char: "f",
      description: "Function name to call",
      required: true,
    }),
    args: Flags.string({
      char: "a",
      description: "Function arguments as a JSON array string",
      required: true,
    }),
    contract: Flags.string({
      char: "c",
      description: "Contract name to use",
      required: true,
      options: ["EarthfastProjects", "EarthfastNodes", "EarthfastEntrypoint", "USDC"] as ContractName[],
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Execute);
    const network = flags.network as NetworkName;
    const walletAddress = flags.wallet;
    const password = flags.password;
    const functionName = flags.function;
    
    // Parse the arguments
    let args;
    try {
      args = JSON.parse(flags.args);
    } catch (error) {
      this.error(`Invalid arguments format. Must be a valid JSON array string: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    try {
      // Get the wallet client
      const kernelClient = await getWalletForAddress(walletAddress, password);
      
      // Get the contract info
      const contractInfo = await loadAbi(network, undefined, flags.contract as ContractName);
      
      // Convert ContractInterface to Abi type for viem compatibility
      const abi = contractInfo.abi as unknown as Abi;
      
      // Encode the function call
      const callData = encodeFunctionData({
        abi,
        functionName,
        args,
      });
      
      // Send the operation
      this.log(`Executing ${functionName} on ${flags.contract} contract...`);
      const userOpHash = await batchUserOperations(
        kernelClient,
        [{
          target: contractInfo.address as `0x${string}`,
          callData,
        }]
      );
      
      this.log(`User operation hash: ${userOpHash}`);
      
      // Wait for the receipt
      this.log("Waiting for transaction to be mined...");
      const receipt = await waitForUserOperationReceipt(kernelClient, userOpHash);
      
      this.log(`Transaction successful! Hash: ${receipt.receipt.transactionHash}`);
      this.log(`Gas used: ${receipt.receipt.gasUsed}`);
      
    } catch (error) {
      this.error(`Failed to execute function: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
