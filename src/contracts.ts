import fs from "fs";
import path from "path";
import type { ContractInterface } from "ethers";
import { NetworkName } from "./networks";

// These imports are necessary to pull these files into dist/
import "../abi/testnet-sepolia/USDC.json";
import "../abi/testnet-sepolia/EarthfastToken.json";
import "../abi/testnet-sepolia/EarthfastRegistry.json";
import "../abi/testnet-sepolia/EarthfastNodes.json";
import "../abi/testnet-sepolia/EarthfastOperators.json";
import "../abi/testnet-sepolia/EarthfastProjects.json";
import "../abi/testnet-sepolia/EarthfastReservations.json";
import "../abi/testnet-sepolia/EarthfastBilling.json";

// These imports are necessary to pull these files into dist/
import "../abi/testnet-sepolia-staging/USDC.json";
import "../abi/testnet-sepolia-staging/EarthfastToken.json";
import "../abi/testnet-sepolia-staging/EarthfastRegistry.json";
import "../abi/testnet-sepolia-staging/EarthfastNodes.json";
import "../abi/testnet-sepolia-staging/EarthfastOperators.json";
import "../abi/testnet-sepolia-staging/EarthfastProjects.json";
import "../abi/testnet-sepolia-staging/EarthfastReservations.json";
import "../abi/testnet-sepolia-staging/EarthfastBilling.json";
import "../abi/testnet-sepolia-staging/EarthfastEntrypoint.json";

export type ContractName =
  | "EarthfastToken"
  | "EarthfastRegistry"
  | "EarthfastNodes"
  | "EarthfastOperators"
  | "EarthfastProjects"
  | "EarthfastReservations"
  | "EarthfastBilling"
  | "EarthfastEntrypoint"
  | "USDC";

export interface ContractInfo {
  address: string;
  abi: ContractInterface;
}

export async function loadAbi(
  network: NetworkName,
  abiDir: string | undefined,
  contract: ContractName
): Promise<ContractInfo> {
  const filename = contract + ".json";
  if (abiDir) {
    return JSON.parse(fs.readFileSync(path.join(abiDir, filename)).toString());
  }
}
