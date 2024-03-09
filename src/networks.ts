export type NetworkName = "testnet" | "testnet-sepolia" | "staging" | "localhost";

export interface NetworkInfo {
  url: string;
  abi?: string;
}

export const Networks: Record<NetworkName, NetworkInfo> = {
  testnet: {
    url: "https://rpc.ankr.com/eth_goerli",
  },
  "testnet-sepolia": {
    url: "https://rpc.ankr.com/eth_sepolia",
  },
  staging: {
    url: "https://rpc.ankr.com/eth_goerli",
  },
  localhost: {
    url: "http://localhost:8545",
    abi: "/Users/dheerajmanjunath/Documents/armada/armada-contracts/deployments/localhost",
  },
};

export const NetworkNames = Object.keys(Networks) as NetworkName[];
