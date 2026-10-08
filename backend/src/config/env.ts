import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET", "dev-secret"),
  paystackSecretKey: required("PAYSTACK_SECRET_KEY", "sk_test_placeholder"),
  // Bachs is the fallback processor while Paystack's business compliance is
  // pending — see paymentsService.isLiveMode. Not `required()`: an
  // environment with no Bachs account yet should still boot, it just can't
  // actually process a BACHS-routed payment until this is set.
  bachsSecretKey: process.env.BACHS_SECRET_KEY ?? "",
  bachsWebhookSecret: process.env.BACHS_WEBHOOK_SECRET ?? "",
  clientOrigin: required("CLIENT_ORIGIN", "http://localhost:3000"),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  platformFeeBps: 1500 // 15%, in basis points — single source of truth for the fee model
};
