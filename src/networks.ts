export type NetworkName = "testnet-sepolia" | "testnet-sepolia-staging" | "localhost";

export interface NetworkInfo {
  url: string;
  funderURL?: string;
  abi?: string;
  chainId?: number;
}

const rpcUrl = process.env.RPC_URL || "https://1rpc.io/sepolia";
export const Networks: Record<NetworkName, NetworkInfo> = {
  "testnet-sepolia": {
    url: rpcUrl,
    funderURL: "https://dashboard-server-sepolia.earthfast.com",
    chainId: 11155111,
  },
  "testnet-sepolia-staging": {
    url: rpcUrl,
    funderURL: "https://dashboard-server-sepolia-staging.earthfast.com",
    chainId: 11155111,
  },
  localhost: {
    url: "http://localhost:8545",
    abi: "../earthfast-contracts/deployments/localhost",
    funderURL: "http://localhost:3000",
    chainId: 31337, //hardhat chain id
  },
};

export const NetworkNames = Object.keys(Networks) as NetworkName[];
