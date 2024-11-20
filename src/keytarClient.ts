// keytar should not be imported directly into files
// instead it should be imported dynamically in functions whenever necessary
// the problem is it has a dependency on libsecret which is not
// installed on ubuntu by default and this fails in CI eg CircleCI img/node
import { execSync } from "child_process";
import os from "os";

function checkDependencies() {
  if (os.platform() !== "linux") return;

  try {
    // Check for libsecret and gnome-keyring
    execSync("ldconfig -p | grep libsecret-1.so.0", { stdio: "ignore", timeout: 500 });
    execSync("which gnome-keyring-daemon", { stdio: "ignore", timeout: 500 });
  } catch (error) {
    console.warn(
      `
      Error: some required dependencies are not installed on your system required to manage the wallet.
      Please install them using:
      sudo apt-get install libsecret-1-dev gnome-keyring dbus-x11
    `
    );
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

class KeytarClient {
  async getKeytar() {
    // check that keytar is installed if ubuntu
    checkDependencies();
    return await import("keytar");
  }
}

export default new KeytarClient();
