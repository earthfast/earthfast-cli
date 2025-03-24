import "dotenv/config"
import {
  createKernelAccount,
  createZeroDevPaymasterClient,
  createKernelAccountClient,
  getUserOperationGasPrice,
  KernelAccountClient,
} from "@zerodev/sdk"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { http, Hex, createPublicClient, zeroAddress, Address, encodeFunctionData, Abi } from "viem"
import { privateKeyToAccount, Account } from "viem/accounts"
import { sepolia } from "viem/chains"
import { KERNEL_V3_1 } from "@zerodev/sdk/constants"
import {
  entryPoint07Address,
  EntryPointVersion,
  UserOperation,
  UserOperationReceipt
} from "viem/account-abstraction"

import { loadWallet } from './keystore';
import { loadAbi, ContractName } from './contracts';
import { NetworkName, Networks } from './networks';

// Should this validation be moved within the createWallet function?
if (
    !process.env.BUNDLER_RPC ||
    !process.env.PAYMASTER_RPC ||
    !process.env.ZERODEV_PROJECT_ID
  ) {
    throw new Error("BUNDLER_RPC or PAYMASTER_RPC or PRIVATE_KEY is not set")
  }
  
const chain = sepolia
const publicClient = createPublicClient({
  transport: http(process.env.BUNDLER_RPC),
  chain,
})

// FIXME: determine how to handle the signer
// const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex)
const entryPoint = {
  address: entryPoint07Address as Address,
  version: "0.7" as EntryPointVersion,
}
const kernelVersion = KERNEL_V3_1

// create a ZeroDev smart wallet for the user given a private key
// TODO: need to cache this data
export const createWallet = async (privateKey: string): Promise<KernelAccountClient> => {
    const signer = privateKeyToAccount(privateKey as Hex)

    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer,
        entryPoint,
        kernelVersion,
    })

    const account = await createKernelAccount(publicClient, {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint,
        kernelVersion,
    })
      console.log("My account:", account.address)

    const paymasterClient = createZeroDevPaymasterClient({
        chain,
        transport: http(process.env.PAYMASTER_RPC),
    })
    
    const kernelClient = createKernelAccountClient({
        account,
        chain,
        bundlerTransport: http(process.env.BUNDLER_RPC),
        client: publicClient,
        paymaster: {
          getPaymasterData: (userOperation) => {
            return paymasterClient.sponsorUserOperation({
              userOperation,
            })
          }
        }
    })

    return kernelClient;
}

export async function getWalletForAddress(address: string, password: string): Promise<KernelAccountClient> {
    const wallet = await loadWallet(address, password);
    return createWallet(wallet.privateKey);
}

/**
 * Get the address of a contract from the ABI files
 * @param network The network to use
 * @param contractName The name of the contract
 * @returns The contract address
 */
export async function getContractAddress(network: NetworkName, contractName: ContractName): Promise<Address> {
  const contractInfo = await loadAbi(network, Networks[network].abi, contractName);
  return contractInfo.address as Address;
}

/**
 * Send a batch of user operations in a single transaction via the kernel client
 * @param kernelClient The kernel client to use
 * @param operations Array of callData and target address pairs
 * @returns The user operation hash
 */
export async function batchUserOperations(
  kernelClient: KernelAccountClient, 
  operations: Array<{ target: Address; callData: `0x${string}`; value?: bigint }>
): Promise<string> {
  if (!kernelClient || !kernelClient.account) {
    throw new Error("Kernel client not found");
  }

  // Encode all calls into a single callData
  const batchCallData = await kernelClient.account.encodeCalls(
    operations.map(op => ({
      to: op.target,
      value: op.value || BigInt(0),
      data: op.callData,
    }))
  );

  console.log("Encoded batch call data:", batchCallData);
  
  try {
    // Send the batch operation
    const userOpHash = await kernelClient.sendUserOperation({
      callData: batchCallData,
    });

    console.log("Batch userOp hash:", userOpHash);
    return userOpHash;
  } catch (error) {
    console.error("Error sending user operation:", error);

    // Check if this is a paymaster error
    if (error instanceof Error && error.message.includes("paymaster")) {
      console.error("This appears to be a paymaster error. The paymaster may not be configured to sponsor this type of transaction.");
      console.error("You may need to fund your account with ETH or configure a different paymaster.");
    }

    throw error;
  }
}

/**
 * Create a batch of encoded user operations for a given contract
 * @param kernelClient The kernel client to use
 * @param network The network to use
 * @param contractName The name of the contract
 * @param functionCalls Array of function names and parameters
 * @returns The user operation hash
 */
export async function batchEncodeContractOperations(
  kernelClient: KernelAccountClient,
  network: NetworkName,
  contractName: ContractName,
  functionCalls: Array<{ functionName: string; args: any[] }>
): Promise<string> {
  // Get the contract address and ABI
  const contractInfo = await loadAbi(network, Networks[network].abi, contractName);
  const contractAddress = contractInfo.address as Address;
  
  // Create an array of operations with encoded function calls
  const operations = await Promise.all(
    functionCalls.map(async ({ functionName, args }) => {
      const callData = encodeFunctionData({
        abi: contractInfo.abi as unknown as Abi,
        functionName,
        args,
      });

      return {
        target: contractAddress as `0x${string}`,
        callData,
        value: BigInt(0),
      };
    })
  );

  // Send the batch operation
  return batchUserOperations(kernelClient, operations);
}


// /**
//  * Create a batch of user operations for the EarthfastProjects contract
//  * @param kernelClient The kernel client to use
//  * @param network The network to use
//  * @param functionCalls Array of function names and parameters
//  * @returns The user operation hash
//  */
// export async function batchProjectOperations(
//   kernelClient: KernelAccountClient,
//   network: NetworkName,
//   functionCalls: Array<{ functionName: string; args: any[] }>
// ): Promise<string> {
//   // Get the EarthfastProjects contract address and ABI
//   const contractInfo = await loadAbi(network, Networks[network].abi, "EarthfastProjects");
//   const projectsAddress = contractInfo.address as Address;
  
//   // Convert ContractInterface to Abi type for viem compatibility
//   const abi = contractInfo.abi as unknown as Abi;

//   // Create an array of operations with encoded function calls
//   const operations = await Promise.all(
//     functionCalls.map(async ({ functionName, args }) => {
//       const callData = encodeFunctionData({
//         abi,
//         functionName,
//         args,
//       });

//       return {
//         target: projectsAddress,
//         callData,
//         value: BigInt(0),
//       };
//     })
//   );

//   // Send the batch operation
//   return batchUserOperations(kernelClient, operations);
// }

/**
 * Wait for a user operation receipt
 * @param kernelClient The kernel client to use
 * @param hash The user operation hash
 * @returns The user operation receipt
 */
export async function waitForUserOperationReceipt(
  kernelClient: KernelAccountClient,
  hash: string
): Promise<UserOperationReceipt> {
  const receipt = await kernelClient.waitForUserOperationReceipt({
    hash: hash as `0x${string}`,
  });
  
  console.log('Bundle transaction hash:', receipt.receipt.transactionHash);
  console.log("User operation completed");
  
  return receipt;
}

// Import Dynamic SDK types (you would need to install @dynamic-labs/sdk-api)
// import { DynamicAuthSigner } from "@dynamic-labs/sdk-api";

// /**
//  * Create a ZeroDev smart wallet using a Dynamic authentication signer
//  * This allows using the same wallet across applications where the user might authenticate with email
//  * @param dynamicAuthAddress The address obtained from Dynamic authentication
//  * @param dynamicAuthSigner The signer object from Dynamic authentication
//  * @param usePaymaster Whether to use the paymaster for gas sponsoring
//  * @returns A KernelAccountClient for the smart wallet
//  */
// export const createWalletFromDynamic = async (
//   dynamicAuthAddress: Address,
//   // dynamicAuthSigner: DynamicAuthSigner,
//   usePaymaster: boolean = true
// ): Promise<KernelAccountClient> => {
//   // For this implementation, we'll assume Dynamic is configured to use ZeroDev
//   // and we have access to the address of the smart wallet

//   // Create a custom connector that uses the Dynamic signer
//   // This is a simplified example - actual implementation would depend on Dynamic's SDK
//   const customConnector = {
//     // Use the address from Dynamic
//     address: dynamicAuthAddress,
//     // Custom signing logic that delegates to Dynamic's signer
//     signMessage: async ({ message }: { message: string }) => {
//       // In a real implementation, this would call dynamicAuthSigner.signMessage
//       // return dynamicAuthSigner.signMessage(message);
//       throw new Error("Dynamic signer integration not fully implemented");
//     },
//     signTypedData: async (typedData: any) => {
//       // In a real implementation, this would call dynamicAuthSigner.signTypedData
//       // return dynamicAuthSigner.signTypedData(typedData);
//       throw new Error("Dynamic signer integration not fully implemented");
//     }
//   };

//   // Create a ZeroDev account using the custom connector
//   // This is a simplified approach - actual implementation would use Dynamic's integration with ZeroDev
//   const account = await createKernelAccount(publicClient, {
//     plugins: {
//       // Use a custom plugin that works with Dynamic's authentication
//       sudo: {
//         // This would be the actual implementation that works with Dynamic's signer
//         address: dynamicAuthAddress,
//         // Other required properties would be implemented here
//       } as any, // Type assertion for demonstration
//     },
//     entryPoint,
//     kernelVersion,
//   });

//   console.log("Dynamic-authenticated account:", account.address);

//   // Create the paymaster client if needed
//   const paymasterClient = createZeroDevPaymasterClient({
//     chain,
//     transport: http(process.env.PAYMASTER_RPC),
//   });
  
//   // Create kernel client configuration
//   const kernelClientConfig = {
//     account,
//     chain,
//     bundlerTransport: http(process.env.BUNDLER_RPC),
//     client: publicClient,
//   };
  
//   // Add paymaster configuration if usePaymaster is true
//   if (usePaymaster) {
//     console.log("Using paymaster for gas sponsoring");
//     return createKernelAccountClient({
//       ...kernelClientConfig,
//       paymaster: {
//         getPaymasterData: (userOperation) => {
//           return paymasterClient.sponsorUserOperation({
//             userOperation,
//           });
//         }
//       }
//     });
//   } else {
//     console.log("Using ETH for gas (no paymaster)");
//     return createKernelAccountClient(kernelClientConfig);
//   }
// };

// /**
//  * Get a wallet for a Dynamic-authenticated user
//  * @param dynamicAuthAddress The address from Dynamic authentication
//  * @param usePaymaster Whether to use the paymaster for gas sponsoring
//  * @returns A KernelAccountClient for the smart wallet
//  */
// export async function getWalletForDynamicAuth(
//   dynamicAuthAddress: Address,
//   usePaymaster: boolean = true
// ): Promise<KernelAccountClient> {
//   try {
//     // Load the Dynamic wallet data from the keystore
//     const walletData = await loadDynamicWallet(dynamicAuthAddress as string);
    
//     // In a real implementation, you would use the dynamicAuthData to reconnect to Dynamic
//     // const dynamicAuthSigner = await reconnectToDynamic(walletData.dynamicAuthData);
    
//     // Create the wallet
//     return createWalletFromDynamic(dynamicAuthAddress, usePaymaster);
//   } catch (error) {
//     // If the wallet is not found in the keystore, we'll try to create it directly
//     console.warn(`Dynamic wallet not found in keystore: ${dynamicAuthAddress}`);
//     console.warn(`Creating wallet directly without keystore data.`);
//     return createWalletFromDynamic(dynamicAuthAddress, usePaymaster);
//   }
// }
