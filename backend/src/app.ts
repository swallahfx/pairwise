import express, { raw } from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { asyncHandler } from "./common/asyncHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { creatorsRouter } from "./modules/creators/creators.routes";
import { rateCardsRouter } from "./modules/rateCards/rateCards.routes";
import { productsRouter } from "./modules/products/products.routes";
import { requestsRouter } from "./modules/requests/requests.routes";
import { offersRouter } from "./modules/offers/offers.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { reviewsRouter } from "./modules/reviews/reviews.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { paymentsController } from "./modules/payments/payments.controller";
import { upfrontRouter } from "./modules/upfront/upfront.routes";
import { brandsRouter } from "./modules/brands/brands.routes";
import { qaRouter } from "./modules/qa/qa.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { analyticsRouter } from "./modules/analytics/analytics.routes";

export const app = express();

app.use(cors({ origin: env.clientOrigin }));

// Registered BEFORE express.json(), and directly on the app rather than
// inside paymentsRouter: this one route needs the raw request body to
// verify Paystack's HMAC signature. Every other /payments/* route needs a
// normally-parsed JSON body, so it has to go through express.json() below
// like every other router — mounting the whole paymentsRouter here too
// would silently starve those routes of a parsed req.body.
app.post("/payments/webhook", raw({ type: "application/json" }), asyncHandler(paymentsController.webhook));

app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Every module mounts here as its own router — this list IS the API's
// surface area. Adding a domain means adding one line, not touching
// existing routes.
app.use("/auth", authRouter);
app.use("/creators", creatorsRouter);
app.use("/rate-card-items", rateCardsRouter);
app.use("/products", productsRouter);
app.use("/requests", requestsRouter);
app.use("/offers", offersRouter);
app.use("/orders", ordersRouter);
app.use("/reviews", reviewsRouter);
app.use("/payments", paymentsRouter);
app.use("/upfront", upfrontRouter);
app.use("/brands", brandsRouter);
app.use("/qa", qaRouter);
app.use("/notifications", notificationsRouter);
app.use("/analytics", analyticsRouter);

app.use(errorHandler);
