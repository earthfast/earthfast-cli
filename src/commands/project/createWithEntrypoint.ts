import { AddressZero } from "@ethersproject/constants";
import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { approve, getContract, getSigner, parseAddress, parseHash, parseUSDC, pretty, run } from "../../helpers";
import { ethers } from "ethers";

// Correct usage example:
// npm run dev project createWithEntrypoint --network localhost --spot 10 0x183921bD248aEB173312A794cFEf413fDE5bF5Ca test-project test@test.com

// TODO: add a call to the faucet to get USDC
// assumes that the signer has already been funded with USDC
export default class ProjectCreateWithEntrypoint extends TransactionCommand {
  static summary = "Atomically create a new project on the EarthFast Network, deposit escrow, and reserve nodes via the entrypoint contract.";
  static examples = ['<%= config.bin %> <%= command.id %> "My Project" notify@myproject.com'];
  static usage = "<%= command.id %> DEPOSIT_AMOUNT OWNER NAME EMAIL [URL] [SHA] [METADATA] [--type TYPE] [--spot BOOLEAN] [--renew BOOLEAN]";
  static args: Arg[] = [
    { name: "DEPOSIT_AMOUNT", description: "The amount of USDC to deposit into escrow.", required: true },
    { name: "OWNER", description: "The owner for the new project.", required: true },
    { name: "NAME", description: "The human readable name of the new project.", required: true },
    { name: "EMAIL", description: "The project email for admin notifications.", required: true },
    { name: "URL", description: "The public URL to fetch the content bundle.", default: "" },
    { name: "SHA", description: "The SHA-256 checksum of the content bundle.", default: "" },
    { name: "METADATA", description: "JSON metadata to attach to this project.", default: "" },
    { name: "NODE_IDS", description: "The comma separated IDs of the nodes to reserve.", default: "[]" },
  ];

  static flags = {
    ...TransactionCommand.flags,
    spot: Flags.boolean({ description: "Change price in the current epoch only (nodes must not be reserved)." }),
    renew: Flags.boolean({ description: "Reserve from the next epoch and on (can unreserve before next epoch start)" }),
    type: Flags.string({
      description: "Project type (static or nextjs)",
      options: ["static", "nextjs"],
      default: "static",
    }),
  };

  public async run(): Promise<unknown> {
    const { args, flags } = await this.parse(ProjectCreateWithEntrypoint);
    console.log("flags: ", flags);
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const signerAddress = await signer.getAddress();
    const usdc = await getContract(flags.network, flags.abi, "USDC", signer);
    const entrypoint = await getContract(flags.network, flags.abi, "EarthfastEntrypoint", signer);
    const projects = await getContract(flags.network, flags.abi, "EarthfastProjects", signer);

    const createProjectData = {
        owner: args.OWNER,
        name: args.NAME,
        email: args.EMAIL,
        content: args.URL,
        checksum: args.SHA && args.SHA.length > 0 ? parseHash(args.SHA) : ethers.constants.HashZero,
        metadata: args.METADATA,
    };

    // TODO: add a try/catch block to handle the case where ids are provided or not with calls to the respective methods
    // const nodeIds = parseHash(args.NODE_IDS);
    // FIXME: cleanup nodes reservations and/or add support for alternative method call
    // if nodeIds is an empty array, reserve 2 nodes
    const nodeIdArray = args.NODE_IDS.split(",");
    console.log(nodeIdArray);
    // const nodeIds = nodeIdArray.length > 0 ? nodeIdArray.map((id: string) => parseHash(id)) : [];
    // const nodesToReserve = nodeIds.length > 0 ? nodeIds : 2;
    const nodesToReserve = 2;
    const slot = { last: !!flags.spot, next: !!flags.renew };
    const depositAmount = parseUSDC(args.DEPOSIT_AMOUNT);

    const output = [];
    const { tx: approveTx, deadline, sig } = await approve(signer, usdc, projects, depositAmount);
    if (approveTx) output.push(await run(approveTx, signer, [usdc]));

    // The contract expects a raw bytes signature
    console.log("Full signature object:", JSON.stringify(sig, null, 2));
    
    // We need to concat r + s + v (v is just 1 byte)
    const signature = ethers.utils.joinSignature(sig);
    console.log("Joined signature:", signature);

    // check usdc balance of signer
    const usdcBalance = await usdc.balanceOf(signerAddress);
    console.log("USDC balance of signer:", usdcBalance.toString());
    if (usdcBalance.lt(depositAmount)) {
      this.error("Signer does not have enough USDC to deposit into escrow");
    }
    
    console.log("Deploying site with parameters:", {
      createProjectData,
      signerAddress,
      nodesToReserve,
      depositAmount: depositAmount.toString(),
      slot,
      deadline,
      sig: signature
    });
    
    const tx = await entrypoint.populateTransaction.deploySite(
      createProjectData, 
      signerAddress, 
      nodesToReserve, 
      depositAmount, 
      slot, 
      deadline, 
      signature  // Pass the joined signature that the contract will split
    );
    output.push(await run(tx, signer, [entrypoint]));
    this.log(pretty(output));
    return output;
  }
  
}
