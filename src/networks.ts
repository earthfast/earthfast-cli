import fs from "fs";
import path from "path";

export type NetworkName = "testnet" | "testnet-sepolia" | "testnet-sepolia-staging" | "staging" | "localhost";

export interface NetworkInfo {
  url: string;
  abi?: string;
}

let RPC_API_KEY: string | null = null;
const keyPath = path.join(process.cwd(), ".earthfast", "rpc_api_key");

if (fs.existsSync(keyPath)) {
  RPC_API_KEY = fs.readFileSync(keyPath, "utf-8").trim();
} else if (process.env.RPC_API_KEY) {
  RPC_API_KEY = process.env.RPC_API_KEY;
} else {
  throw new Error(
    "No RPC API key found. Please set it in .earthfast/rpc_api_key or as an environment variable RPC_API_KEY"
  );
}

export const Networks: Record<NetworkName, NetworkInfo> = {
  testnet: {
    url: "https://rpc.ankr.com/eth_goerli",
  },
  "testnet-sepolia": {
    url: `https://eth-sepolia.g.alchemy.com/v2/${RPC_API_KEY}`,
  },
  "testnet-sepolia-staging": {
    url: `https://eth-sepolia.g.alchemy.com/v2/${RPC_API_KEY}`,
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
