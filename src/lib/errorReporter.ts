export interface ErrorContext {
  route?: string;
  requestId?: string;
}

export function reportError(error: unknown, context?: ErrorContext): void {
  const route = context?.route;
  const requestId = context?.requestId;

  const parts = [`[ErrorReporter]`];
  if (route) parts.push(`route=${route}`);
  if (requestId) parts.push(`requestId=${requestId}`);

  console.error(parts.join(" "), error);
}
