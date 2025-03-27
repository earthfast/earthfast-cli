import { AddressZero } from "@ethersproject/constants";
import { Flags } from "@oclif/core";
import { Arg } from "@oclif/core/lib/interfaces";
import { TransactionCommand } from "../../base";
import { approve, getContract, getSigner, parseAddress, parseHash, parseUSDC, pretty, run } from "../../helpers";
import { ethers } from "ethers";

// assumes that the signer has already been funded with USDC
export default class ProjectCreateWithEntrypoint extends TransactionCommand {
  static summary = "Atomically create a new project on the EarthFast Network, deposit escrow, and reserve nodes via the entrypoint contract.";
  static examples = [
    '<%= config.bin %> <%= command.id %> 10 0x123456... "My Project" notify@myproject.com',
    '<%= config.bin %> <%= command.id %> 10 0x123456... "My Project" notify@myproject.com "0xnode1,0xnode2"'
  ];
  static usage = "<%= command.id %> DEPOSIT_AMOUNT OWNER NAME EMAIL [NODE_IDS] [URL] [SHA] [METADATA] [--type TYPE] [--spot] [--renew]";
  static args: Arg[] = [
    { name: "DEPOSIT_AMOUNT", description: "The amount of USDC to deposit into escrow.", required: true },
    { name: "OWNER", description: "The owner for the new project.", required: true },
    { name: "NAME", description: "The human readable name of the new project.", required: true },
    { name: "EMAIL", description: "The project email for admin notifications.", required: true },
    { name: "NODE_IDS", description: "The comma separated IDs of the nodes to reserve. Leave empty to auto-assign nodes.", default: "" },
    { name: "URL", description: "The public URL to fetch the content bundle.", default: "" },
    { name: "SHA", description: "The SHA-256 checksum of the content bundle.", default: "" },
    { name: "METADATA", description: "JSON metadata to attach to this project.", default: "" },
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

    if (!flags.spot && !flags.renew) {
      this.error("Must specify at least one of --spot and/or --renew.");
    }
    const signer = await getSigner(flags.network, flags.rpc, flags.address, flags.signer, flags.key, flags.account);
    const signerAddress = await signer.getAddress();
    const usdc = await getContract(flags.network, flags.abi, "USDC", signer);
    const entrypoint = await getContract(flags.network, flags.abi, "EarthfastEntrypoint", signer);
    const projects = await getContract(flags.network, flags.abi, "EarthfastProjects", signer);
    const nodes = await getContract(flags.network, flags.abi, "EarthfastNodes", signer);

    // Handle metadata with project type
    let metadata = args.METADATA;
    if (metadata === "") {
      // If no metadata was provided, create basic metadata with type
      metadata = JSON.stringify({ type: flags.type });
    } else {
      try {
        // If metadata was provided, merge with type
        const parsedMetadata = JSON.parse(metadata);
        parsedMetadata.type = flags.type;
        metadata = JSON.stringify(parsedMetadata);
      } catch (e) {
        this.error("METADATA must be valid JSON.");
      }
    }

    const createProjectData = {
        owner: args.OWNER,
        name: args.NAME,
        email: args.EMAIL,
        content: args.URL,
        checksum: args.SHA && args.SHA.length > 0 ? parseHash(args.SHA) : ethers.constants.HashZero,
        metadata: metadata,
    };

    const nodeIdArray = args.NODE_IDS.split(",");

    // Make slot default to true for both properties, but allow override by flags
    const slot = { last: !!flags.spot, next: !!flags.renew };

    console.log("slot: ", slot, "flags.spot: ", flags.spot, "flags.renew: ", flags.renew);

    const depositAmount = parseUSDC(args.DEPOSIT_AMOUNT);

    const output = [];

    // generate the approval signature for the escrow deposit to the projects contract
    const { tx: approveTx, deadline, sig } = await approve(signer, usdc, projects, depositAmount);
    if (approveTx) output.push(await run(approveTx, signer, [usdc]));

    // format signature to match entrypoint contract requirements
    // We need to concat r + s + v (v is just 1 byte)
    const signature = ethers.utils.joinSignature(sig);
    console.log("Joined signature:", signature);

    // check usdc balance of signer
    const usdcBalance = await usdc.balanceOf(signerAddress);
    console.log("USDC balance of signer:", usdcBalance.toString());
    if (usdcBalance.lt(depositAmount)) {
      this.error("Signer does not have enough USDC to deposit into escrow");
    }

    // Determine whether to use deploySite or deploySiteWithNodeIds based on NODE_IDS argument
    const hasNodeIds = args.NODE_IDS !== "" && nodeIdArray.length > 0 && nodeIdArray[0] !== "";

    if (hasNodeIds) {
        // Parse the node IDs
        const nodeIds = nodeIdArray.map((id: string) => parseHash(id));

        // get the node prices from the contract
        // if spot is true, use the current price
        // if renew is true, use the next price
        // otherwise, use the current price
        // if both are true, use the next price
        let slotToUse = 0;
        if (slot.last && slot.next) {
            slotToUse = 1;
        } else if (slot.last) {
            slotToUse = 0;
        } else if (slot.next) {
            slotToUse = 1;
        }
        const nodePrices = await Promise.all(nodeIds.map(async (id: string) => {
            const node = await nodes.getNode(id);
            return node.prices[slotToUse];
        }));

        console.log("Deploying site with specific node IDs:", {
            createProjectData,
            signerAddress,
            nodeIds,
            nodePrices,
            depositAmount: depositAmount.toString(),
            slot,
            deadline,
            sig: signature
        });

        const tx = await entrypoint.populateTransaction.deploySiteWithNodeIds(
            createProjectData, 
            signerAddress, 
            nodeIds,
            nodePrices,
            depositAmount,
            slot, 
            deadline, 
            signature
        );
        output.push(await run(tx, signer, [entrypoint]));
    } else {
        const nodesToReserve = 1;

        console.log("Deploying site with number of nodes:", {
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
            signature
        );
        output.push(await run(tx, signer, [entrypoint]));
    }

    this.log(pretty(output));
    return output;
  }
}
