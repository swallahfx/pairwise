type Role = "DEVELOPER" | "CREATOR" | "ADMIN" | "BRAND";

// "Developer" read as app-developers-only to brands, agencies, and anyone
// else hiring a creator — this is the single place that display label
// lives, so every role badge/picker across the app stays in sync without
// hand-matching a ternary in five different files. The underlying
// Role.DEVELOPER value, DeveloperProfile model, etc. are unchanged.
const ROLE_LABELS: Record<Role, string> = {
  DEVELOPER: "Business",
  CREATOR: "Creator",
  BRAND: "Brand",
  ADMIN: "Admin"
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}
