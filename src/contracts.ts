import fs from "fs";
import type { ContractInterface } from "ethers";

// These imports are necessary to pull these files into dist/
import "../abi/staging/ArmadaNodes.json";
import "../abi/staging/ArmadaProjects.json";
import "../abi/staging/ArmadaReservations.json";
import "../abi/testnet/ArmadaNodes.json";
import "../abi/testnet/ArmadaProjects.json";
import "../abi/testnet/ArmadaReservations.json";

export type ContractName = "ArmadaNodes" | "ArmadaProjects" | "ArmadaReservations";

export interface ContractInfo {
  address: string;
  abi: ContractInterface;
}

export async function loadAbi(path: string): Promise<ContractInfo> {
  const importPrefix = "import://";
  if (path.startsWith(importPrefix)) {
    return await import(path.slice(importPrefix.length));
  } else {
    return JSON.parse(fs.readFileSync(path).toString());
  }
}
