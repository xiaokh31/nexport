export const emailOutboxSchedulerContract = Object.freeze({
  path: "/api/cron/email-outbox",
  method: "GET" as const,
  frequencyMinutes: 5,
  authorizationHeader: "Authorization",
  authorizationScheme: "Bearer",
  defaultBatchSize: 25,
  maximumBatchSize: 100,
  requestTimeoutSeconds: 50,
  retryableStatuses: [429, 500, 503] as const,
});
