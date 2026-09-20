import { IncidentSession } from "./IncidentSession";
import { checkEdgeNetworkHealth } from "./tools/healthCheck";

export interface Env {
  // Binding to Cloudflare Workers AI
  AI: Ai;
  // Binding to the IncidentSession Durable Object
  INCIDENT_SESSION: DurableObjectNamespace<IncidentSession>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Endpoint for checking edge network health
    if (url.pathname === "/health") {
      const healthData = checkEdgeNetworkHealth();
      return new Response(JSON.stringify(healthData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // New Endpoint: /api/diagnose
    if (url.pathname === "/api/diagnose" && request.method === "POST") {
      const body = await request.json() as { sessionId: string; userQuery: string; logSnippet?: string };
      const { sessionId, userQuery, logSnippet } = body;

      if (!sessionId || !userQuery) {
        return new Response("Missing sessionId or userQuery", { status: 400, headers: corsHeaders });
      }

      // Route request to the Durable Object
      const id = env.INCIDENT_SESSION.idFromName(sessionId);
      const sessionStub = env.INCIDENT_SESSION.get(id);

      // Fetch active conversation history
      const history = await sessionStub.get_history();

      // Get current cluster metrics
      const metrics = checkEdgeNetworkHealth();

      // Define the exact System Prompt requested
      const systemPrompt = `You are a Senior Site Reliability Engineer (SRE) and Infrastructure Platform Engineer at Cloudflare.
Your objective is to diagnose system failures, analyze error logs, and correlate them with real-time infrastructure metrics to provide immediate, actionable remediation.

INPUT CONTEXT
You will receive:

A user query describing the issue.

[SYSTEM METRICS AT RUNTIME]: A JSON object detailing the current health, latency, and error rates of edge services.

[INCIDENT LOG DATA]: (Optional) Raw stack traces, application logs, or telemetry data.

INSTRUCTIONS
Root Cause Analysis: Identify the exact point of failure from the logs. Do not guess; if the logs are insufficient, state what additional telemetry is needed.

Metrics Correlation: Cross-reference the failure with the provided system metrics. Identify if the issue is isolated (e.g., a bad code deployment) or systemic (e.g., regional degraded performance in the 'auth-gateway').

Remediation: Provide precise, copy-pasteable commands or code snippets to fix the issue. Use specific tools like kubectl, terraform, wrangler, or bash scripts.

OUTPUT FORMAT
Incident Summary: 1-2 concise sentences summarizing the failure.

Root Cause: Bulleted technical explanation.

Remediation: Code blocks with the exact fix.
Do not include conversational filler, greetings, or sign-offs. Be dense, accurate, and highly technical.`;

      // Construct user message integrating metrics and logs
      const userMessageContent = `User Query: ${userQuery}\n\n[SYSTEM METRICS AT RUNTIME]:\n${JSON.stringify(metrics, null, 2)}\n\n[INCIDENT LOG DATA]:\n${logSnippet || "No logs provided."}`;
      
      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessageContent }
      ];

      // Save user's message to DO history
      await sessionStub.append_message({ role: "user", content: userMessageContent });

      // Call Cloudflare Workers AI with the specified model and messages array
      const aiResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: messages
      });

      const aiReply = (aiResponse as any).response;

      // Save AI's response to DO history
      await sessionStub.append_message({ role: "assistant", content: aiReply });

      // Return the JSON response with CORS headers
      return new Response(JSON.stringify({ response: aiReply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Previous sample chat endpoint
    if (url.pathname === "/chat") {
      const id = env.INCIDENT_SESSION.idFromName("default-session");
      const sessionStub = env.INCIDENT_SESSION.get(id);

      if (request.method === "POST") {
        const body = await request.json() as { message: string };
        await sessionStub.append_message({ role: "user", content: body.message });

        const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          prompt: body.message
        });
        
        const aiMessage = (response as any).response;
        await sessionStub.append_message({ role: "assistant", content: aiMessage });

        return new Response(JSON.stringify({ response: aiMessage }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else if (request.method === "GET") {
        const history = await sessionStub.get_history();
        return new Response(JSON.stringify(history), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else if (request.method === "DELETE") {
        await sessionStub.clear_session();
        return new Response("Session cleared", { headers: corsHeaders });
      }
    }

    return new Response("Welcome to the Incident Copilot Worker!", { status: 200, headers: corsHeaders });
  },
};

export { IncidentSession };
