# EdgeOps AI Copilot

## Overview & Objective
EdgeOps AI Copilot is an AI-powered diagnostic platform engineered to treat operational infrastructure challenges as software problems. Functioning as a self-service Site Reliability Engineering (SRE) assistant, it directly ingests raw error logs and stack traces, cross-references them against real-time synthetic system health metrics, and deterministically generates precise, actionable remediation commands (e.g., `kubectl`, `terraform`, or `bash` scripts). 

By leveraging AI-native problem-solving at the edge, this tool significantly reduces operational toil, accelerates Mean Time To Resolution (MTTR), and ensures high system reliability without requiring deep domain expertise for every microservice.

## Architecture Flow
The platform is built entirely on the Cloudflare edge ecosystem, ensuring minimal latency and high availability. The request lifecycle operates as follows:

1. **Client Request (Cloudflare Pages):** The React/TypeScript frontend captures the user's diagnostic query and raw log payload.
2. **API Routing (Cloudflare Workers):** The request hits the `POST /api/diagnose` route on the Worker, which validates the payload and queries the internal `/health` metric system.
3. **State Management (Cloudflare Durable Objects):** The Worker routes the request to a specific `IncidentSession` Durable Object. The DO safely appends the new query to the ongoing incident history using `blockConcurrencyWhile` for strict transactional serialization.
4. **AI Inference (Cloudflare Workers AI):** The Worker constructs a highly context-aware prompt array (System Instructions + DO History + Telemetry + User Query) and invokes the `@cf/meta/llama-3.3-70b-instruct-fp8-fast` model.
5. **Response Cycle:** The generated remediation steps are synchronously appended to the Durable Object state and returned to the frontend client for rendering.

## Key Features
* **Context-Aware Log Analysis:** Dynamically parses complex stack traces and correlates them with current cluster degradation states (e.g., latency spikes in the `auth-gateway`).
* **Edge-Native Stateful Memory:** Utilizes Durable Objects to maintain continuous incident session context, allowing SREs to iteratively debug ongoing outages without losing context.
* **Actionable Remediation:** Strictly outputs precise, copy-pasteable CLI commands for immediate execution, bypassing conversational fluff.

## Tech Stack
* **Compute:** Cloudflare Workers (V8 Isolates)
* **State Management:** Cloudflare Durable Objects (RPC API)
* **AI/Inference:** Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`)
* **Frontend:** React + TypeScript, Vite, Tailwind CSS v4 (Deployed via Cloudflare Pages)

## Local Setup & Deployment

### Prerequisites
* Node.js (v18+)
* A Cloudflare account with a registered `.workers.dev` subdomain.

### Installation
Clone the repository and install dependencies for both the backend and frontend:
```bash
# Install backend Worker dependencies
npm install

# Install frontend dashboard dependencies
cd dashboard
npm install
cd ..
```

### Local Development Environment
The local environment requires running both the Worker API and the React Vite server simultaneously.

**Terminal 1 (Backend Worker):**
```bash
npm run start
# Alternatively: npx wrangler dev
```
*Note: The AI binding requires a remote proxy. Ensure you are authenticated via `npx wrangler login`.*

**Terminal 2 (Frontend Dashboard):**
```bash
cd dashboard
npm run dev
```
The dashboard will be available at `http://localhost:5173`, proxying API requests to the Worker at `http://localhost:8787`.

### Production Deployment
Deploy the backend and frontend independently to the Cloudflare edge.

**Deploy the API Backend (Workers):**
```bash
npx wrangler deploy
```

**Deploy the Frontend (Pages):**
```bash
cd dashboard
npm run build
npx wrangler pages deploy dist
```

## AI Transparency
As part of the core assignment requirements and our commitment to verifiable infrastructure, a strict audit trail of all AI-assisted coding prompts utilized during the scaffolding and development of this repository has been permanently logged in the `PROMPT_HISTORY.md` file.
