with (import <nixpkgs> {});
mkShell {
  buildInputs = [
    nodejs-16_x
    yarn
  ] ++ lib.optionals stdenv.isDarwin (with darwin.apple_sdk.frameworks; [
    IOKit
  ]);
}
