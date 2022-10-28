import { Contract } from "ethers";

export async function decodeEvent(receipt: { logs: string | any[]; }, contract: Contract, event: string) {
  const results = [];
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    try {
      const args = contract.interface.decodeEventLog(
        event,
        log.data,
        log.topics
      );
      if (args) {
        results.push(args);
      }
    } catch {
      continue;
    }
  }
  return results.length === 1 ? results[0] : results;
}

export async function waitTx(txPromise: any) {
  return await (await txPromise).wait();
}
