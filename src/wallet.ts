import "dotenv/config"
import {
  createKernelAccount,
  createZeroDevPaymasterClient,
  createKernelAccountClient,
  getUserOperationGasPrice,
  KernelAccountClient,
} from "@zerodev/sdk"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import { http, Hex, createPublicClient, zeroAddress, Address } from "viem"
import { privateKeyToAccount, Account } from "viem/accounts"
import { sepolia } from "viem/chains"
import { KERNEL_V3_1 } from "@zerodev/sdk/constants"
import {
  entryPoint07Address,
  EntryPointVersion,
  UserOperation
} from "viem/account-abstraction"

import { loadWallet } from './keystore';

// Should this validation be moved within the createWallet function?
if (
    !process.env.BUNDLER_RPC ||
    !process.env.PAYMASTER_RPC ||
    !process.env.PRIVATE_KEY
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
// TODO: have this function accept a signer and use it to create the wallet
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

// TODO: add return type
// TODO: parameterize the call data
export async function processUserOperation(kernelClient: KernelAccountClient){
    if (!kernelClient || !kernelClient.account) {
        throw new Error("Kernel client not found");
    }
    
    const userOpHash = await kernelClient.sendUserOperation({
        callData: await kernelClient.account.encodeCalls([
            {
                to: zeroAddress,
                value: BigInt(0),
                data: "0x",
            },
        ]),
    });
    console.log("userOp hash:", userOpHash)

    const _receipt = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash,
    })
    console.log('bundle txn hash: ', _receipt.receipt.transactionHash);
    
    console.log("userOp completed");
    return _receipt;
}
