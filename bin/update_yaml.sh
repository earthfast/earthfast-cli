# Run the node list command to get the updated list of nodes
nodes_list_output=$(npm run run -- node list --network=testnet-sepolia-staging)

# Extract node IDs and hostnames from the node list output using jq
node_entries=$(echo "$nodes_list_output" | jq -r '.[] | "\(.id) \(.host)"')

# Load the current .yaml file
yaml_content=$(cat $YAML_FILE_PATH)

# Append new nodes to the yaml content
while read -r line; do
  node_id=$(echo $line | awk '{print $1}')
  hostname=$(echo $line | awk '{print $2}')
  node_entry=$(printf "    - id: \"%s\"\n      hostname: %s\n" "$node_id" "$hostname")
  yaml_content=$(echo -e "$yaml_content\n$node_entry")
done <<< "$node_entries"
