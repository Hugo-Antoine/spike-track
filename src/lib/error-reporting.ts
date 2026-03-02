import { env } from "~/env";

interface ErrorReport {
  message: string;
  context?: string;
  path?: string;
  userId?: string;
  error?: unknown;
}

export function reportError(report: ErrorReport) {
  const payload = {
    timestamp: new Date().toISOString(),
    message: report.message,
    context: report.context,
    path: report.path,
    userId: report.userId,
    stack: report.error instanceof Error ? report.error.stack : undefined,
  };

  // Structured JSON log for Vercel/CloudWatch
  console.error(JSON.stringify(payload));

  // Optional Discord webhook (fire-and-forget)
  if (env.DISCORD_WEBHOOK_URL) {
    const content = [
      `**${report.message}**`,
      report.path && `Path: \`${report.path}\``,
      report.context && `Context: ${report.context}`,
      report.userId && `User: \`${report.userId}\``,
      report.error instanceof Error &&
        `\`\`\`\n${report.error.stack?.slice(0, 1500)}\n\`\`\``,
    ]
      .filter(Boolean)
      .join("\n");

    fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => {
      // Never crash the app for reporting failures
    });
  }
}
