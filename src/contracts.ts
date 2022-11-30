import fs from "fs";
import path from "path";
import type { ContractInterface } from "ethers";
import { NetworkName } from "./networks";

// These imports are necessary to pull these files into dist/
import "../abi/staging/ArmadaToken.json";
import "../abi/staging/ArmadaNodes.json";
import "../abi/staging/ArmadaOperators.json";
import "../abi/staging/ArmadaProjects.json";
import "../abi/staging/ArmadaReservations.json";
import "../abi/testnet/ArmadaToken.json";
import "../abi/testnet/ArmadaNodes.json";
import "../abi/testnet/ArmadaOperators.json";
import "../abi/testnet/ArmadaProjects.json";
import "../abi/testnet/ArmadaReservations.json";

export type ContractName = "ArmadaToken" | "ArmadaNodes" | "ArmadaOperators" | "ArmadaProjects" | "ArmadaReservations";

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
  return await import(path.join("../abi", network, filename));
}
