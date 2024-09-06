with (import <nixpkgs> {});
mkShell {
  buildInputs = [
    nodejs-20_x
  ] ++ lib.optionals stdenv.isDarwin (with darwin.apple_sdk.frameworks; [
    IOKit
  ]);
}
