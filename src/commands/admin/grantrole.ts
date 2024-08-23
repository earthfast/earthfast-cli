import { HashZero } from "@ethersproject/constants";
import { Arg } from "@oclif/core/lib/interfaces";
import { ethers } from "ethers";
import { TransactionCommand } from "../../base";
import { getSigner, parseAddress, pretty, run } from "../../helpers";

const DEFAULT_ADMIN_ROLE = "DEFAULT_ADMIN_ROLE";

export default class GrantRole extends TransactionCommand {
  static summary = "Grant a role to an account on the EarthFast Network.";
  static examples = [
    "<%= config.bin %> <%= command.id %> RECONCILER_ROLE 0x0000000000000000000000000000000000000000 0xContractAddress",
  ];
  static usage = "<%= command.id %> ROLE ACCOUNT CONTRACT_ADDRESS";
  static args: Arg[] = [
    { name: "ROLE", description: "The role to grant.", required: true },
    { name: "ACCOUNT", description: "The address to grant the role to.", required: true },
    { name: "CONTRACT_ADDRESS", description: "The address of the contract.", required: true },
  ];

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(GrantRole);

    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const abi = ["function grantRole(bytes32 role, address account) external"];
    const contract = new ethers.Contract(args.CONTRACT_ADDRESS, abi, signer);

    // The value of DEFAULT_ADMIN_ROLE is HashZero, otherwise hash the role name to get the value
    const role = args.ROLE === DEFAULT_ADMIN_ROLE ? HashZero : ethers.utils.id(args.ROLE);
    const account = parseAddress(args.ACCOUNT);

    try {
      const tx = await contract.populateTransaction.grantRole(role, account);
      const output = await run(tx, signer, [contract]);
      this.log(pretty(output));
      return output;
    } catch (e) {
      this.error(`Error granting role`);
    }
  }
}
