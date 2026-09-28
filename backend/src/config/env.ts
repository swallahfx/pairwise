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
  clientOrigin: required("CLIENT_ORIGIN", "http://localhost:3000"),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  platformFeeBps: 1500 // 15%, in basis points — single source of truth for the fee model
};
