import { version } from "../../package.json";
import { BlockchainCommand } from "../base";
import { getContract, getProvider, pretty } from "../helpers";

export default class Status extends BlockchainCommand {
  static summary = "Shows the current epoch status.";
  static examples = ["<%= config.bin %> <%= command.id %>"];
  static usage = "<%= command.id %>";
  static enableJsonFlag = true;

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(Status);
    const provider = await getProvider(flags.network, flags.rpc);
    const registry = await getContract(flags.network, flags.abi, "EarthfastRegistry", provider);
    const billing = await getContract(flags.network, flags.abi, "EarthfastBilling", provider);
    const netVersion = await registry.getVersion();
    const cliVersion = version;

    // last is current epoch
    const lastEpochStartRaw = await registry.getLastEpochStart();
    const lastEpochLengthRaw = await registry.getLastEpochLength();

    const lastEpochStart = lastEpochStartRaw ? Number(lastEpochStartRaw) : 0;
    const lastEpochLength = lastEpochLengthRaw ? Number(lastEpochLengthRaw) : 0;

    const billingNodeIndexRaw = await billing.getBillingNodeIndex();
    const renewalNodeIndexRaw = await billing.getRenewalNodeIndex();

    const billingNodeIndex = billingNodeIndexRaw ? Number(billingNodeIndexRaw) : 0;
    const renewalNodeIndex = renewalNodeIndexRaw ? Number(renewalNodeIndexRaw) : 0;

    const output = {
      netVersion,
      cliVersion,
      epochDuration: `${lastEpochLength} seconds`,
      lastEpochStart: `${new Date(lastEpochStart * 1000).toISOString()}`,
      lastEpochEnd: `${new Date((lastEpochStart + lastEpochLength) * 1000).toISOString()}`,
      billingNodeIndex,
      renewalNodeIndex,
      gracePeriod: "24 hours before the end of an epoch",
    };

    this.log(pretty(output));
    return output;
  }
}
