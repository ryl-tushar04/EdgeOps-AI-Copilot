# Prompt History

This document serves as an audit trail of the AI-assisted coding prompts used to scaffold and build the **EdgeOps AI Copilot** repository, as per assignment requirements.

## 1. Backend Initialization (Cloudflare Workers & Durable Objects)
> "Initialize a Cloudflare Workers project in TypeScript. Set up the wrangler.toml to bind Cloudflare Workers AI and a Durable Object named IncidentSession. Write the Durable Object class to handle storing and retrieving a chat history array. The Durable Object should expose a simple internal API to get_history, append_message, and clear_session. Ensure the state is strictly serialized using the block concurrency methods recommended in the latest Cloudflare documentation."

## 2. Telemetry Mocking (Health Checks)
> "Inside the Worker's source directory, create a tools/healthCheck.ts file. Write a function that returns a mocked JSON object representing the current health of a Cloudflare-like edge network. It should include varying statuses (HEALTHY, DEGRADED, DOWN) and metrics (latency, error rates) for services like 'edge-cache-proxy' and 'auth-gateway'. Export this function so the main Worker can call it when a user queries system health."

## 3. API Routing and LLM Integration
> "Update the main index.ts Worker file. Implement a REST API route POST /api/diagnose. The route must: Accept a JSON payload with sessionId, userQuery, and logSnippet. Route the request to the IncidentSession Durable Object to fetch the active conversation history. Call the mock health check function to get current cluster metrics. Construct an array of messages combining the system prompt, the retrieved Durable Object history, the mock metrics, and the new user query. Call the Cloudflare Workers AI binding using the @cf/meta/llama-3.3-70b-instruct-fp8-fast model. Save the AI's response back to the Durable Object and return the JSON response to the client. Ensure robust CORS headers are included."

## 4. Frontend Scaffolding (React, Vite, Tailwind)
> "Scaffold a new React + TypeScript application using Vite. Configure Tailwind CSS. Build a two-pane developer dashboard UI. The left pane should be a 'Log Ingestion' terminal where a user can paste raw stack traces, alongside a small section displaying the mock system health metrics. The right pane should be a conversational chat feed displaying the AI's diagnostic steps. Connect the frontend to the Worker's POST /api/diagnose endpoint. Prioritize a dense, high-contrast, technical aesthetic suitable for an internal infrastructure team."

## 5. Documentation
> "Generate a comprehensive, engineering-focused README.md for a project named EdgeOps AI Copilot. Explain how the tool reduces operational toil, ensures system reliability, and leverages AI-native problem-solving at the edge. Map out the request lifecycle... Provide the exact terminal commands to install dependencies, run the local dev environment... Add a short section explicitly stating that all AI-assisted coding prompts are logged in the PROMPT_HISTORY.md file."
