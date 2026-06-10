# 🤝 Arc Agent-to-Agent Payment Gateway

A bidirectional autonomous payment gateway between two agents on **Arc testnet**.

## Overview

This project demonstrates **agent-to-agent economic interaction** — one of the core ideas of the agentic economy. Agent A (Service Provider) and Agent B (Client) can send USDC to each other both manually and automatically.

## Features

- **Manual Payments**: Send USDC in either direction (A→B or B→A)
- **Auto Mode**: Agent A automatically sends 0.05 USDC to Agent B every 5 minutes
- **Auto Payback Logic**: After Agent A sends total 0.1 USDC, Agent B automatically sends back 0.05 USDC
- **Live Balances** for both agents
- **Full Transaction History** with on-chain links
- **Password-protected controls**
- Clean, responsive dashboard

## Live Demo

(Will be added after Render deployment)

## Tech Stack

- Node.js + Express
- ethers.js
- Arc Testnet (USDC as native gas token)

## Setup (Local)

```bash
npm install
node gateway-agent.js

Open: http://localhost:3000

Environment Variables
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
PRIVATE_KEY_AGENT_A=0x...
PRIVATE_KEY_AGENT_B=0x...
TOGGLE_PASSWORD=yourpassword


Built ForArc Testnet • Agentic Economy experiments • Agora Agents Hackathon style projectsMade with  for the Arc ecosystem

