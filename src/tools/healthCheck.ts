export type ServiceStatus = "HEALTHY" | "DEGRADED" | "DOWN";

export interface ServiceHealthMetrics {
  status: ServiceStatus;
  latencyMs: number;
  errorRatePercentage: number;
  message?: string;
}

export interface EdgeNetworkHealth {
  timestamp: string;
  overallStatus: ServiceStatus;
  services: Record<string, ServiceHealthMetrics>;
}

/**
 * Returns a mocked JSON object representing the current health of a Cloudflare-like edge network.
 * Includes varying statuses and metrics for critical services.
 */
export function checkEdgeNetworkHealth(): EdgeNetworkHealth {
  return {
    timestamp: new Date().toISOString(),
    overallStatus: "DEGRADED",
    services: {
      "edge-cache-proxy": {
        status: "HEALTHY",
        latencyMs: 18,
        errorRatePercentage: 0.01,
        message: "Operating normally",
      },
      "auth-gateway": {
        status: "DEGRADED",
        latencyMs: 450,
        errorRatePercentage: 3.8,
        message: "Elevated latency and error rates detected in identity verification",
      },
      "worker-execution-engine": {
        status: "HEALTHY",
        latencyMs: 24,
        errorRatePercentage: 0.05,
        message: "Operating normally",
      },
      "analytics-pipeline": {
        status: "DOWN",
        latencyMs: -1,
        errorRatePercentage: 100.0,
        message: "Service is temporarily offline for scheduled database migrations",
      }
    }
  };
}
