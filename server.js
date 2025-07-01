require('dotenv').config();
const express   = require('express');
const fs        = require('fs');
const path      = require('path');
const { spawn } = require('child_process');

const app        = express();
const PORT       = process.env.PORT || 3000;

// Get WHITELIST_DIR from command-line arguments or fallback to .env
const WHITELIST_DIR = path.resolve(
  process.argv.find(arg => arg.startsWith('--whitelist-dir='))?.split('=')[1] || process.env.WHITELIST_DIR
);

// Helper: current UNIX time in seconds
const now = () => Math.floor(Date.now() / 1000);

/**
 * Pick the whitelist file whose timestamp prefix is
 * the largest value < now().
 */
function getCurrentWhitelistFile() {
    const files = fs.readdirSync(WHITELIST_DIR)
        .filter(f => /^\d+_.*\.json$/.test(f))
        .map(f => ({
            filename: f,
            timestamp: parseInt(f.split('_')[0], 10)
        }))
        .filter(f => f.timestamp < now())
        .sort((a, b) => b.timestamp - a.timestamp);

    if (!files.length) return null;
    return path.join(WHITELIST_DIR, files[0].filename);
}

/**
 * Load the JSON and return a map: address → amount
 */
function loadWhitelistMap() {
  const file = getCurrentWhitelistFile();
  if (!file) throw new Error('No upcoming whitelist file found');
  const data = JSON.parse(fs.readFileSync(file));
  return data.reduce((m, entry) => {
    m[entry.address] = entry.amount;
    return m;
  }, {});
}

/**
 * GET /get_maximum/:address
 * → { address, amount }
 */
app.get('/get_maximum/:address', (req, res) => {
  try {
    const m = loadWhitelistMap();
    const amt = m[req.params.address];
    if (amt == null) return res.status(404).json({ error: 'Address not found' });
    res.json({ address: req.params.address, amount: amt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /generate_proof/:address
 * → { address, amount, proofs: [ ... ] }
 */
app.get('/generate_proof/:address', (req, res) => {
  try {
    const file = getCurrentWhitelistFile();
    if (!file) return res.status(500).json({ error: 'No current whitelist file found' });

    const data = JSON.parse(fs.readFileSync(file));
    const entry = data.find(e => e.address === req.params.address);
    if (!entry) return res.status(404).json({ error: 'Address not found' });

    const args = [
      'merkle-airdrop-cli',
      'generateProofs',
      '--file', file,
      '--address', entry.address,
      '--amount', entry.amount.toString()
    ];

    // spawn via npx so it works without a global install
    const cli = spawn('npx', args);

    let out = '', errBuf = '';
    cli.stdout.on('data', d => out += d);
    cli.stderr.on('data', d => errBuf += d);
    cli.on('close', code => {
      if (code !== 0) {
        return res.status(500).json({ error: errBuf || `CLI exited ${code}` });
      }
      // merkle-airdrop-cli prints a JSON array of proof hex strings
      let proofs;
      try {
        proofs = JSON.parse(out);
      } catch {
        // Otherwise it’s in the form [ 'hex1', 'hex2', … ]
        // 1) remove the leading/trailing [ ]
        // 2) split on commas
        // 3) strip any surrounding quotes & whitespace
        const inner = out
          .trim()
          .replace(/^\[\s*|\s*\]$/g, '');      // drop [ ]
        proofs = inner
          .split(',')
          .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      }
      res.json({ address: entry.address, amount: entry.amount, proofs });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Whitelist dir ${WHITELIST_DIR}`)
  console.log(`▶️  Server listening on port ${PORT}`);
});