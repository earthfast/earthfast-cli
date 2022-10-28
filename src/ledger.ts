// Adapted from https://github.com/ethers-io/ethers.js/tree/ce8f1e4015c0f27bf178238770b1325136e3351a/packages/hardware-wallets
// @ts-nocheck

import { ethers } from "ethers";
import Eth from "@ledgerhq/hw-app-eth";

import type { Transport } from "@ledgerhq/hw-transport-node-hid";

export type TransportCreator = {
  create: () => Promise<Transport>;
};

let hidCache: Promise<typeof import("@ledgerhq/hw-transport-node-hid")> = null;

const hidWrapper = Object.freeze({
  create: function (): Promise<Transport> {
    // Load the library if not loaded
    if (hidCache == null) {
      hidCache = new Promise((resolve, reject) => {
        try {
          let hid = require("@ledgerhq/hw-transport-node-hid");
          if (hid.create == null) {
            resolve(hid["default"]);
          }
          resolve(hid);
        } catch (error) {
          reject(error);
        }
      });
      /*
      hidCache = import("@ledgerhq/hw-transport-node-hid").then((hid) => {
          if (hid.create == null) { return hid["default"]; }
          return hid;
      });
      */
    }

    return hidCache.then((hid) => {
      return hid.create();
    });
  },
});

export const transports: { [name: string]: TransportCreator } = Object.freeze({
  hid: hidWrapper,
  default: hidWrapper,
});

const defaultPath = "m/44'/60'/0'/0/0";

function waiter(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

export class LedgerSigner extends ethers.Signer {
  readonly type: string;
  readonly path: string;

  readonly _eth: Promise<Eth>;

  constructor(provider?: ethers.providers.Provider, type?: string, path?: string) {
    super();
    if (path == null) {
      path = defaultPath;
    }
    if (type == null) {
      type = "default";
    }

    ethers.utils.defineReadOnly(this, "path", path);
    ethers.utils.defineReadOnly(this, "type", type);
    ethers.utils.defineReadOnly(this, "provider", provider || null);

    const transport = transports[type];
    if (!transport) {
      logger.throwArgumentError("unknown or unsupported type", "type", type);
    }

    ethers.utils.defineReadOnly(
      this,
      "_eth",
      transport.create().then(
        (transport) => {
          const eth = new Eth(transport);
          return eth.getAppConfiguration().then(
            (config) => {
              return eth;
            },
            (error) => {
              return Promise.reject(error);
            }
          );
        },
        (error) => {
          return Promise.reject(error);
        }
      )
    );
  }

  _retry<T = any>(callback: (eth: Eth) => Promise<T>, timeout?: number): Promise<T> {
    return new Promise(async (resolve, reject) => {
      if (timeout && timeout > 0) {
        setTimeout(() => {
          reject(new Error("timeout"));
        }, timeout);
      }

      const eth = await this._eth;

      // Wait up to 5 seconds
      for (let i = 0; i < 50; i++) {
        try {
          const result = await callback(eth);
          return resolve(result);
        } catch (error) {
          if (error.id !== "TransportLocked") {
            return reject(error);
          }
        }
        await waiter(100);
      }

      return reject(new Error("timeout"));
    });
  }

  async getAddress(): Promise<string> {
    const account = await this._retry((eth) => eth.getAddress(this.path));
    return ethers.utils.getAddress(account.address);
  }

  async signMessage(message: ethers.utils.Bytes | string): Promise<string> {
    if (typeof message === "string") {
      message = ethers.utils.toUtf8Bytes(message);
    }

    const messageHex = ethers.utils.hexlify(message).substring(2);

    const sig = await this._retry((eth) => eth.signPersonalMessage(this.path, messageHex));
    sig.r = "0x" + sig.r;
    sig.s = "0x" + sig.s;
    return ethers.utils.joinSignature(sig);
  }

  async signTransaction(transaction: ethers.providers.TransactionRequest): Promise<string> {
    const tx = await ethers.utils.resolveProperties(transaction);
    const baseTx: ethers.utils.UnsignedTransaction = {
      chainId: tx.chainId || undefined,
      data: tx.data || undefined,
      gasLimit: tx.gasLimit || undefined,
      gasPrice: (tx.gasPrice || tx.maxFeePerGas || undefined),
      nonce: tx.nonce ? ethers.BigNumber.from(tx.nonce).toNumber() : undefined,
      to: tx.to || undefined,
      value: tx.value || undefined,
    };

    const unsignedTx = ethers.utils.serializeTransaction(baseTx).substring(2);
    const sig = await this._retry((eth) => eth.signTransaction(this.path, unsignedTx, null));

    return ethers.utils.serializeTransaction(baseTx, {
      v: ethers.BigNumber.from("0x" + sig.v).toNumber(),
      r: "0x" + sig.r,
      s: "0x" + sig.s,
    });
  }

  connect(provider: ethers.providers.Provider): ethers.Signer {
    return new LedgerSigner(provider, this.type, this.path);
  }
}