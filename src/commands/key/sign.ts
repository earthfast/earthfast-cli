import { Command, Flags } from "@oclif/core";
import { createWallet } from "../../zeroDevWallet";
import { NetworkName, NetworkNames, Networks } from "../../networks";
import { loadAbi, ContractName } from "../../contracts";
import { ethers } from "ethers";
import { TransactionCommand } from "../../base";
import { getSigner } from "../../helpers";
import { TypedDataSigner } from "@ethersproject/abstract-signer";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { Wallet } from "ethers";

export default class Sign extends TransactionCommand {
  static description = "Generate an approval signature for deploySite";

  static examples = [
    `$ earthfast key sign --network testnet-sepolia --wallet 0x123... --password mypassword --amount 10 --deadline 1742434970 --token USDC`,
    `$ earthfast key sign --network testnet-sepolia --wallet 0x123... --password mypassword --amount 10 --deadline 1742434970 --token-address 0x456...`,
    `$ earthfast key sign --network testnet-sepolia --wallet 0x123... --password mypassword --amount 10 --deadline 1742434970 --token USDC --use-kernel`,
  ];

  static flags = {
    ...super.flags,
    amount: Flags.string({
      char: "a",
      description: "Amount of tokens to approve",
      required: true,
    }),
    deadline: Flags.string({
      char: "d",
      description: "Deadline timestamp for the signature",
      required: true,
    }),
    token: Flags.string({
      char: "t",
      description: "Token name (e.g., USDC)",
      exclusive: ["token-address"],
    }),
    "token-address": Flags.string({
      description: "Token contract address",
      exclusive: ["token"],
    }),
    "use-kernel": Flags.boolean({
      description: "Use ZeroDev kernel client for signing",
      default: false,
    }),
    decimals: Flags.integer({
      description: "Token decimals (only needed with token-address)",
      default: 18,
    }),
    spender: Flags.string({
        description: "Contract being authorized to interact with the provided token",
    })
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Sign);
    const network = flags.network as NetworkName;
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const signerAddress = await signer.getAddress();
    const privateKey = ((signer as Wallet).privateKey);
    const amount = flags.amount;
    const deadline = parseInt(flags.deadline);
    const useKernel = flags["use-kernel"];
    const spender = flags.spender;

    if (!flags.token && !flags["token-address"]) {
      this.error("Either --token or --token-address must be provided");
    }

    try {
      // Get contract info based on token name or address
      let tokenInfo: { address: string; name: string; decimals: number };
      if (flags.token) {
        const contractInfo = await loadAbi(network, undefined, flags.token as ContractName);
        if (!contractInfo) {
          throw new Error(`Failed to load token information for ${flags.token}`);
        }
        // For known tokens, we'll use standard ERC20 decimals
        tokenInfo = {
          address: contractInfo.address,
          name: flags.token,
          decimals: 18, // Standard ERC20 decimals
        };
      } else if (flags["token-address"]) {
        // For custom token addresses, we create a minimal token info object
        tokenInfo = {
          address: flags["token-address"],
          name: "ERC20",
          decimals: flags.decimals,
        };
      } else {
        throw new Error("Either --token or --token-address must be provided");
      }
      
      // Convert amount using the token's decimals
      const amountInTokens = ethers.utils.parseUnits(amount, tokenInfo.decimals);

      // Create the domain separator for EIP-712
      const domain = {
        name: tokenInfo.name,
        version: "1", // Default to version 1 for EF tokens
        chainId: Networks[network].chainId,
        verifyingContract: tokenInfo.address as `0x${string}`,
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

      let signature;
      let nonce;

      if (useKernel) {
        // Use ZeroDev kernel client for signing
        const smartWallet = await createWallet(privateKey);
        if (!smartWallet || !smartWallet.account) {
          throw new Error("Failed to create smart wallet");
        }
        const smartWalletAddress = await smartWallet.account.address;
        const publicClient = createPublicClient({
          transport: http(Networks[network].url),
          chain: sepolia,
        });

        // Get nonce from token contract
        const tokenContract = new ethers.Contract(
          tokenInfo.address,
          ["function nonces(address) view returns (uint256)"],
          new ethers.providers.JsonRpcProvider(Networks[network].url)
        );
        nonce = await tokenContract.nonces(smartWalletAddress);
        
        const permitData = {
          owner: smartWalletAddress,
          spender: spender,
          value: BigInt(amountInTokens.toString()),
          nonce: BigInt(nonce.toString()),
          deadline: BigInt(deadline),
        };

        console.log("Permit data:", permitData);

        // Sign using the kernel account
        const rawSignature = await smartWallet.account.signTypedData({
          domain,
          types,
          primaryType: "Permit",
          message: permitData,
        });

        // Format the signature into r, s, v components and concatenate them
        // The raw signature is 130 bytes (0x...), we need to split it into r (32 bytes), s (32 bytes), and v (1 byte)
        const r = rawSignature.slice(0, 66); // 0x + 64 chars
        const s = "0x" + rawSignature.slice(66, 130); // 64 chars
        const v = parseInt(rawSignature.slice(130, 132), 16); // 2 chars

        // Concatenate the signature components into a single string
        signature = r + s.slice(2) + v.toString(16).padStart(2, '0');
      } else {        
        // Get nonce from token contract
        const tokenContract = new ethers.Contract(
          tokenInfo.address,
          ["function nonces(address) view returns (uint256)"],
          signer
        );
        nonce = await tokenContract.nonces(signerAddress);

        const permitData = {
          owner: signerAddress,
          spender: spender,
          value: amountInTokens,
          nonce,
          deadline,
        };

        signature = await (signer as unknown as TypedDataSigner)._signTypedData(domain, types, permitData);
      }

      // Output the signature and related data
      this.log("Signature data:");
      this.log(signature);

    } catch (error) {
      this.error(`Failed to generate signature: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
