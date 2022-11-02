export type NetworkName = "testnet" | "staging" | "localhost";

export interface NetworkInfo {
  url: string;
  abi: string;
}

export const Networks: Record<NetworkName, NetworkInfo> = {
  testnet: {
    url: "https://rpc.ankr.com/eth_goerli",
    abi: "import://../abi",
  },
  staging: {
    url: "https://rpc.ankr.com/eth_goerli",
    abi: "import://../abi",
  },
  localhost: {
    url: "http://localhost:8545",
    abi: "../armada-contracts/deployments",
  },
};

export const NetworkNames = Object.keys(Networks) as NetworkName[];
