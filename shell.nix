with (import <nixpkgs> {});
mkShell {
  buildInputs = [
    nodejs-16_x
    yarn
  ];
}
