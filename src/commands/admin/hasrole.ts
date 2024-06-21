import { HashZero } from "@ethersproject/constants";
import { Arg } from "@oclif/core/lib/interfaces";
import { ethers } from "ethers";
import { TransactionCommand } from "../../base";
import { getProvider, parseAddress } from "../../helpers";

const DEFAULT_ADMIN_ROLE = "DEFAULT_ADMIN_ROLE";

export default class HasRole extends TransactionCommand {
  static summary = "Grant a role to an account on the Armada Network.";
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
    const { args, flags } = await this.parse(HasRole);

    const provider = await getProvider(flags.network, flags.rpc);
    const abi = ["function hasRole(bytes32 role, address account) external view returns (bool)"];

    // The value of DEFAULT_ADMIN_ROLE is HashZero, otherwise hash the role name to get the value
    const role = args.ROLE === DEFAULT_ADMIN_ROLE ? HashZero : ethers.utils.id(args.ROLE);
    const account = parseAddress(args.ACCOUNT);

    const myContract = new ethers.Contract(args.CONTRACT_ADDRESS, abi, provider);
    const contract = myContract.connect(provider);

    const hasAdminRole = await contract.hasRole(role, account);

    if (hasAdminRole) {
      console.log(`${account} has the role ${args.ROLE}`);
      return true;
    } else {
      console.log(`${account} does not have the role ${args.ROLE}`);
      return false;
    }
  }
}
