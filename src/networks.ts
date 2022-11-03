export type NetworkName = "testnet" | "staging" | "localhost";

export interface NetworkInfo {
  url: string;
  abi?: string;
}

export const Networks: Record<NetworkName, NetworkInfo> = {
  testnet: {
    url: "https://rpc.ankr.com/eth_goerli",
  },
  staging: {
    url: "https://rpc.ankr.com/eth_goerli",
  },
  localhost: {
    url: "http://localhost:8545",
    abi: "../armada-contracts/deployments/localhost",
  },
};

export const NetworkNames = Object.keys(Networks) as NetworkName[];
