#!/bin/bash

NODE_KEY=
RPC_ENDPOINT=https://eth-sepolia.g.alchemy.com/v2/hYUZAbKWAtFe-tXDs125NRoF_dRKdFdS

# Path to your .yaml file
YAML_FILE_PATH="~/Documents/git/github.com/thegpvc/inexorable-node/k8s/charts/content-node/values.testnet-sepolia-staging-use1.yaml"

# Function to create a node and capture the output
create_node() {
  local index=$1
  command_output=$(npm run run -- node create 0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563 content${index}.use1.testnet-sepolia-staging.armadanodes.com:us:true:1.0 --network=testnet-sepolia-staging --key=$NODE_KEY --rpc=$RPC_ENDPOINT)
  echo "$command_output"
}
