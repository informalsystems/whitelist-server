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

