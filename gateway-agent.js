require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

let transactionHistory = [];
let isEnabled = true;
let autoPaymentEnabled = false;

let totalSentByA = 0;
let totalReceivedByA = 0;
let totalSentByB = 0;
let totalReceivedByB = 0;

const TOGGLE_PASSWORD = process.env.TOGGLE_PASSWORD || "arc12345";

const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);

const agentA = new ethers.Wallet(process.env.PRIVATE_KEY_AGENT_A, provider);
const agentB = new ethers.Wallet(process.env.PRIVATE_KEY_AGENT_B, provider);

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)'
];

async function getBalance(wallet) {
  try {
    const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const bal = await contract.balanceOf(wallet.address);
    return parseFloat(ethers.formatUnits(bal, 6));
  } catch (e) {
    return 0;
  }
}

async function sendPayment(from, to, amount, note = "") {
  try {
    const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, from);
    const amountInUnits = ethers.parseUnits(amount.toString(), 6);
    const tx = await contract.transfer(to.address, amountInUnits);
    await tx.wait();

    const log = {
      time: new Date().toLocaleString(),
      from: from.address.substring(0, 8) + "...",
      to: to.address.substring(0, 8) + "...",
      amount: amount,
      note: note,
      txHash: tx.hash,
      status: "✅ Sent"
    };

    transactionHistory.unshift(log);
    if (transactionHistory.length > 20) transactionHistory.pop();

    // Update totals
    if (from === agentA) {
      totalSentByA += amount;
      totalReceivedByB += amount;
    } else {
      totalSentByB += amount;
      totalReceivedByA += amount;
    }

    console.log(`💸 ${amount} USDC sent ${note}`);
    return true;
  } catch (e) {
    console.error("Payment failed", e.message);
    return false;
  }
}

// === AUTO PAYMENT LOGIC (A → B every 5 mins) ===
setInterval(async () => {
  if (!isEnabled || !autoPaymentEnabled) return;

  const sent = await sendPayment(agentA, agentB, 0.05, "(Auto recurring)");

  if (sent && totalSentByA >= 0.1) {
    await sendPayment(agentB, agentA, 0.05, "(Auto payback after 0.1 received)");
    totalSentByA = 0; // Reset counter after payback
  }
}, 5 * 60 * 1000);

// Dashboard
app.get('/', async (req, res) => {
  const balA = await getBalance(agentA);
  const balB = await getBalance(agentB);

  res.send(`
    <html>
      <head>
        <title>Agent-to-Agent Payment Gateway</title>
        <meta http-equiv="refresh" content="12">
        <style>
          body { font-family: Arial, sans-serif; padding: 25px; background: #0f172a; color: #e2e8f0; }
          table { border-collapse: collapse; width: 100%; background: #1e2937; margin-top: 15px; }
          th, td { padding: 12px; border: 1px solid #334155; }
          button { padding: 12px 20px; margin: 5px; border: none; border-radius: 6px; cursor: pointer; }
          .stats { background: #1e2937; padding: 15px; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <h1>🤝 Agent-to-Agent Payment Gateway</h1>
        <p><strong>Status:</strong> ${isEnabled ? '🟢 Active' : '🔴 Stopped'}</p>
        <p><strong>Auto Mode (A → B + Payback):</strong> ${autoPaymentEnabled ? '🟢 ENABLED' : '🔴 Disabled'}</p>

        <div class="stats">
          <strong>Agent A Totals:</strong><br>
          Sent: ${totalSentByA.toFixed(4)} USDC | Received: ${totalReceivedByA.toFixed(4)} USDC<br><br>
          <strong>Agent B Totals:</strong><br>
          Sent: ${totalSentByB.toFixed(4)} USDC | Received: ${totalReceivedByB.toFixed(4)} USDC
        </div>

        <h2>Balances</h2>
        <p><strong>Agent A:</strong> ${balA.toFixed(4)} USDC</p>
        <p><strong>Agent B:</strong> ${balB.toFixed(4)} USDC</p>

        <h2>Transaction History</h2>
        <table>
          <tr><th>Time</th><th>From</th><th>To</th><th>Amount</th><th>Note</th></tr>
          ${transactionHistory.map(t => `
            <tr>
              <td>${t.time}</td>
              <td>${t.from}</td>
              <td>${t.to}</td>
              <td>${t.amount} USDC</td>
              <td>${t.note}</td>
            </tr>
          `).join('')}
        </table>

        <div style="margin-top: 30px; padding: 25px; background: #1e2937; border-radius: 8px;">
          <h3>💸 Manual Payment</h3>
          <form action="/send" method="POST">
            <select name="direction">
              <option value="AtoB">Agent A → Agent B</option>
              <option value="BtoA">Agent B → Agent A</option>
            </select>
            <input type="number" name="amount" placeholder="Amount" step="0.01" required>
            <button type="submit">Send</button>
          </form>
        </div>

        <div style="margin-top: 20px;">
          <form action="/toggle-auto" method="POST">
            <button type="submit">Toggle Auto Mode (A→B + Payback)</button>
          </form>
          <form action="/toggle" method="POST">
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Toggle Whole Gateway</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

app.post('/send', express.urlencoded({ extended: true }), async (req, res) => {
  const direction = req.body.direction;
  const amount = parseFloat(req.body.amount);

  if (direction === "AtoB") {
    await sendPayment(agentA, agentB, amount);
  } else {
    await sendPayment(agentB, agentA, amount);
  }

  res.redirect('/');
});

app.post('/toggle-auto', express.urlencoded({ extended: true }), (req, res) => {
  autoPaymentEnabled = !autoPaymentEnabled;
  res.send(`<h2>Auto Mode is now ${autoPaymentEnabled ? 'ENABLED' : 'DISABLED'}</h2><p><a href="/">← Back</a></p>`);
});

app.post('/toggle', express.urlencoded({ extended: true }), (req, res) => {
  if (req.body.password === TOGGLE_PASSWORD) {
    isEnabled = !isEnabled;
    res.send(`<h2>Gateway is now ${isEnabled ? 'ENABLED' : 'DISABLED'}</h2><p><a href="/">← Back</a></p>`);
  } else {
    res.send(`<h2>❌ Wrong password</h2><p><a href="/">← Try again</a></p>`);
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Agent-to-Agent Gateway running at http://localhost:${PORT}`);
});