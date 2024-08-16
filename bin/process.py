import re
import json

# Read the data from the file
with open('data.json', 'r') as file:
    data = file.read()

# Add double quotes to the keys
data = re.sub(r"(\w+):", r'"\1":', data)

# Parse the JSON data
data = json.loads(data)

# Extract id and host
extracted_data = [{'id': node['id'], 'host': node['host']} for node in data]

# Format and print the extracted data
print("contentNode:")
print("  nodes:")
for entry in extracted_data:  # Limiting to the first 7 entries as per the example
    print(f'    - id: "{entry["id"]}"')
    print(f'      hostname: {entry["host"]}')
