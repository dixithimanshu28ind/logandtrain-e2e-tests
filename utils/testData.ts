export const TEST_PASSWORD = "TestPass123!";

export function randomTestEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@gymlog-test.dev`;
}
