// keytar should not be imported directly into files
// instead it should be imported dynamically in functions whenever necessary
// the problem is it has a dependency on libsecret which is not
// installed on ubuntu by default and this fails in CI eg CircleCI img/node
class KeytarClient {
  async getKeytar() {
    return await import("keytar");
  }
}

export default new KeytarClient();
