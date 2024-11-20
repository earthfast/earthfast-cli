import { Command } from "@oclif/core";
import axios, { AxiosError } from "axios";
import { isAddress } from "ethers/lib/utils";

export default class OperatorFaucet extends Command {
  static description = "Request test tokens for node operator (0.2 Sepolia ETH and 100 EARTHFAST tokens)";

  static args = [
    {
      name: "address",
      required: true,
      description: "Ethereum address to receive tokens",
    },
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(OperatorFaucet);
    const { address } = args;

    // Validate ethereum address
    if (!isAddress(address)) {
      this.error("Invalid Ethereum address provided");
    }

    try {
      this.log(`Sending request to faucet for address: ${address}`);

      const response = await axios.post(`https://jorge-server.earthfast-dev.com/operator-faucet`, {
        operatorAddress: address,
      });

      this.log(`Response status: ${response.status}`);
      this.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);

      this.log(`✅ Success: Sent 0.2 ETH and 100 EARTHFAST tokens to ${address}`);
      this.log(response.data.message);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        this.log(`Error details: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);

        if (error.response?.data?.error) {
          this.error(`Failed: ${error.response.data.error}`);
        } else {
          this.error("Failed to request tokens from faucet");
        }
      } else {
        this.error("An unexpected error occurred");
      }
    }
  }
}
