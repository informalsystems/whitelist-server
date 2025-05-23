# merkle-airdrop-server

A small Express.js service that serves per-address airdrop maximums and Merkle proofs based on time-ordered “whitelist” JSON files.

## Endpoints
GET /get_maximum/:address
Returns { address, amount } for the given address in the current whitelist.

GET /generate_proof/:address
Runs npx merkle-airdrop-cli generateProofs against the current whitelist, returning { address, amount, proofs: [...] }.

## Local Setup
1. Clone the repository
```bash
git clone
cd merkle-airdrop-server
```

2. Install dependencies
```bash
yarn install
```
You will also need the Merkle Airdrop CLI installed globally, see here: https://github.com/CosmWasm/cw-tokens/tree/main/contracts/cw20-merkle-airdrop/helpers


3. Start the server
```bash
npm start
```

4. Test the endpoints
```bash
curl http://localhost:3000/get_maximum/0x1234567890abcdef1234567890abcdef12345678
```
```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "amount": 1000
}
```

## Automated Deployment

Upon changes, this Github repo will automatically be deployed to a DigitalOcean droplet via a Github action.
The action will SSH into the droplet and run `git pull` to update the code, then restart the server.

The Droplet details are stored as Github secrets.

## Whitelists

The whitelists are stored in the `whitelists` directory. Each whitelist is a JSON file with the following format:
```json
[
  { "address": "neutron14fmxw54lgvheyn7m0p9efpr82fac68ysph96ch", "amount": "999"},
  { "address": "neutron1r6rv879netg009eh6ty23v57qrq29afecuehlm", "amount": "991"},
  ...
]
```

The filename should be in the format `{unix_timestamp}_whitelist.json`, where the timestamp is the time the whitelist should go into effect.
The server will serve the whitelist with the highest timestamp that is less the current time.