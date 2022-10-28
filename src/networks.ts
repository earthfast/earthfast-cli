import ArmadaProjectsTestnetDeployment from "../abi/testnet/ArmadaProjects.json";
import ArmadaProjectsStagingDeployment from "../abi/staging/ArmadaProjects.json";
import ArmadaNodesTestnetDeployment from "../abi/testnet/ArmadaNodes.json";
import ArmadaNodesStagingDeployment from "../abi/staging/ArmadaNodes.json";

export interface NetworkInfo {
  url: string;
  id?: number;
  label?: string;
}

export type supportedNetworks = "testnet" | "staging";
export type supportedContracts = "projects" | "nodes";

export type Networks = { [name: string]: NetworkInfo };

export const defaultNetworks: Networks = {
  testnet: {
    url: "https://rpc.ankr.com/eth_goerli",
    id: 5, // Goerli
  },
  staging: {
    url: "https://rpc.ankr.com/eth_goerli",
    id: 5, // Goerli
  },
};

const contracts = {
  staging: {
    projects: ArmadaProjectsStagingDeployment,
    nodes: ArmadaNodesStagingDeployment,
  },

  testnet: {
    projects: ArmadaProjectsTestnetDeployment,
    nodes: ArmadaNodesTestnetDeployment,
  },
};

export const getArmadaAbi = (network: supportedNetworks, contract: supportedContracts): any => {
  return contracts[network || "testnet"][contract];
};

export const getNetworkRpcUrl = (network: supportedNetworks): string => {
  return defaultNetworks[network || "testnet"].url;
};
