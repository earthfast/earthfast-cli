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

const entryPoint = {
  address: entryPoint07Address as Address,
  version: "0.7" as EntryPointVersion,
}
const kernelVersion = KERNEL_V3_1

// create a ZeroDev smart wallet for the user given a private key
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

    // // try simulating user op to get more information on the revert reason
    // try {
    //   const simulatedOp = await kernelClient.simulateUserOperation({
    //     callData: batchCallData,
    //   });
    //   console.error("Simulation failed with:", simulatedOp);
    // } catch (simError) {
    //   console.error("Simulation error:", simError);
    // }

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
