export type NetworkName = "testnet-sepolia" | "testnet-sepolia-staging" | "localhost";

export interface NetworkInfo {
  url: string;
  abi?: string;
}

const rpcUrl = process.env.RPC_URL || "https://rpc.ankr.com/eth_sepolia";
export const Networks: Record<NetworkName, NetworkInfo> = {
  "testnet-sepolia": {
    url: rpcUrl,
  },
  "testnet-sepolia-staging": {
    url: rpcUrl,
  },
  localhost: {
    url: "http://localhost:8545",
    abi: "/Users/dheerajmanjunath/Documents/armada/earthfast-contracts/deployments/localhost",
  },
};

export const NetworkNames = Object.keys(Networks) as NetworkName[];
