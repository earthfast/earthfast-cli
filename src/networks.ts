import type { ContractInterface } from "ethers";

import StagingNodesDeployment from "../abi/staging/ArmadaNodes.json";
import StagingProjectsDeployment from "../abi/staging/ArmadaProjects.json";
import StagingReservationsDeployment from "../abi/staging/ArmadaReservations.json";

import TestnetNodesDeployment from "../abi/testnet/ArmadaNodes.json";
import TestnetProjectsDeployment from "../abi/testnet/ArmadaProjects.json";
import TestnetReservationsDeployment from "../abi/testnet/ArmadaReservations.json";

export type NetworkName = "testnet" | "staging";
export type ContractName = "nodes" | "projects" | "reservations";

export interface NetworkInfo {
  url: string;
}

export interface ContractInfo {
  address: string;
  abi: ContractInterface;
}

export const Networks: Record<NetworkName, NetworkInfo> = {
  testnet: {
    url: "https://rpc.ankr.com/eth_goerli",
  },
  staging: {
    url: "https://rpc.ankr.com/eth_goerli",
  },
};

export const Contracts: Record<NetworkName, Record<ContractName, ContractInfo>> = {
  testnet: {
    nodes: TestnetNodesDeployment,
    projects: TestnetProjectsDeployment,
    reservations: TestnetReservationsDeployment,
  },
  staging: {
    nodes: StagingNodesDeployment,
    projects: StagingProjectsDeployment,
    reservations: StagingReservationsDeployment,
  },
};

export const NetworkNames = Object.keys(Networks) as NetworkName[];
