import { app } from "./app";
import { env } from "./config/env";
import { ordersService } from "./modules/orders/orders.service";
import { upfrontService } from "./modules/upfront/upfront.service";

app.listen(env.port, () => {
  console.log(`Pairwize API listening on :${env.port}`);
});

// Sweeps for orders stuck in SUBMITTED past the 7-day auto-approve window,
// and Upfront purchases whose program date has passed by the same margin
// with no buyer confirmation. A real deployment would run this from a
// scheduler (cron, a queue worker) rather than an in-process interval —
// this is here so the behavior is visible and testable without standing
// up separate infra.
setInterval(() => {
  ordersService.autoApproveOverdue().catch((err) => console.error("order auto-approve sweep failed", err));
  upfrontService.autoApproveOverduePurchases().catch((err) => console.error("upfront auto-approve sweep failed", err));
}, 60 * 60 * 1000);
