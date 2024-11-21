export type NetworkName = "testnet-sepolia" | "testnet-sepolia-staging" | "localhost";

export interface NetworkInfo {
  url: string;
  funderURL?: string;
  abi?: string;
}

const rpcUrl = process.env.RPC_URL || "https://rpc.ankr.com/eth_sepolia";
export const Networks: Record<NetworkName, NetworkInfo> = {
  "testnet-sepolia": {
    url: rpcUrl,
    funderURL: "https://dashboard-server-sepolia.earthfast.com",
  },
  "testnet-sepolia-staging": {
    url: rpcUrl,
    funderURL: "https://dashboard-server-sepolia-staging.earthfast.com",
  },
  localhost: {
    url: "http://localhost:8545",
    abi: "../earthfast-contracts/deployments/localhost",
    funderURL: "http://localhost:3000",
  },
};

export const NetworkNames = Object.keys(Networks) as NetworkName[];
