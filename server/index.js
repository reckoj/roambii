// Load environment variables from .env file
console.log("🚀 Starting server...");
console.log("📁 Current working directory:", process.cwd());
console.log("📄 Loading environment variables...");

require("dotenv").config();

console.log("🔑 Environment variables loaded:");
console.log("- NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("- PORT:", process.env.PORT || "not set (will use 4000)");
console.log(
  "- STRIPE_SECRET_KEY:",
  process.env.STRIPE_SECRET_KEY ? "✅ Set" : "❌ Missing"
);
console.log(
  "- STRIPE_WEBHOOK_SECRET:",
  process.env.STRIPE_WEBHOOK_SECRET ? "✅ Set" : "❌ Missing"
);

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { networkInterfaces } = require('os');

// Validate critical environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.error(
    "❌ CRITICAL ERROR: STRIPE_SECRET_KEY is not set in environment variables"
  );
  console.error("📝 Please create a .env file in the server directory with:");
  console.error("   STRIPE_SECRET_KEY=your_stripe_secret_key_here");
  console.error("   STRIPE_WEBHOOK_SECRET=your_webhook_secret_here");
  process.exit(1);
}

console.log("💳 Initializing Stripe...");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
console.log("✅ Stripe initialized successfully");

const app = express();
const port = process.env.PORT || 4000;

console.log("⚙️ Setting up middleware...");

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true
  })
);
app.use(bodyParser.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  console.log("📋 Headers:", req.headers);
  next();
});

console.log("✅ Middleware configured");

// Validate amount is a positive number
const validateAmount = (amount) => {
  const numAmount = Number(amount);
  return !isNaN(numAmount) && numAmount > 0;
};

// Create a payment intent
app.post("/create-payment-intent", async (req, res) => {
  console.log("💳 Payment intent request received");
  console.log("📋 Request body:", JSON.stringify(req.body, null, 2));

  try {
    const { amount, currency, packageId, email, name, description } = req.body;

    console.log("🔍 Validating request parameters...");

    // Validate the required fields
    if (!amount || !currency || !packageId || !email || !name) {
      console.log("❌ Missing required parameters");
      console.log("- amount:", amount || "missing");
      console.log("- currency:", currency || "missing");
      console.log("- packageId:", packageId || "missing");
      console.log("- email:", email || "missing");
      console.log("- name:", name || "missing");

      return res.status(400).json({
        error: { message: "Missing required parameters" },
      });
    }

    // Validate amount
    if (!validateAmount(amount)) {
      console.log("❌ Invalid amount:", amount);
      return res.status(400).json({
        error: { message: "Invalid amount" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format:", email);
      return res.status(400).json({
        error: { message: "Invalid email format" },
      });
    }

    console.log("✅ Request validation passed");
    console.log("💳 Creating Stripe payment intent...");

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      description: description || `Payment for package ${packageId}`,
      metadata: {
        packageId,
        customerEmail: email,
        customerName: name,
      },
      receipt_email: email,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log("✅ Payment intent created successfully:");
    console.log("- ID:", paymentIntent.id);
    console.log("- Amount:", paymentIntent.amount);
    console.log("- Currency:", paymentIntent.currency);

    // Return the client secret to the client
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("❌ Error creating payment intent:");
    console.error("- Message:", error.message);
    console.error("- Type:", error.type);
    console.error("- Code:", error.code);
    console.error("- Stack:", error.stack);

    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      return res.status(400).json({
        error: { message: error.message },
      });
    }

    res.status(500).json({
      error: { message: "Failed to create payment intent" },
    });
  }
});

// Create a subscription
app.post("/create-subscription", async (req, res) => {
  console.log("💳 Subscription creation request received");
  console.log("📋 Request body:", JSON.stringify(req.body, null, 2));

  try {
    const { userId, planId, priceId, email, name } = req.body;

    console.log("🔍 Validating subscription parameters...");

    // Validate required fields
    if (!userId || !planId || !priceId || !email || !name) {
      console.log("❌ Missing required parameters for subscription");
      return res.status(400).json({
        error: { message: "Missing required parameters" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format:", email);
      return res.status(400).json({
        error: { message: "Invalid email format" },
      });
    }

    console.log("✅ Subscription request validation passed");
    console.log("💳 Creating Stripe customer and subscription...");

    // Create or retrieve customer
    let customer;
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      customer = customers.data[0];
      console.log("👤 Existing customer found:", customer.id);
    } else {
      customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          userId: userId,
        },
      });
      console.log("👤 New customer created:", customer.id);
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: priceId,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId,
        planId: planId,
      },
    });

    console.log("✅ Subscription created successfully:");
    console.log("- Subscription ID:", subscription.id);
    console.log("- Customer ID:", customer.id);
    console.log("- Status:", subscription.status);

    // Return client secret for payment confirmation
    res.json({
      subscriptionId: subscription.id,
      customerId: customer.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status,
    });
  } catch (error) {
    console.error("❌ Error creating subscription:");
    console.error("- Message:", error.message);
    console.error("- Type:", error.type);
    console.error("- Code:", error.code);

    res.status(500).json({
      error: { message: "Failed to create subscription" },
    });
  }
});

// Cancel subscription
app.post("/cancel-subscription", async (req, res) => {
  console.log("🚫 Subscription cancellation request received");
  
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        error: { message: "Subscription ID is required" },
      });
    }

    console.log("🚫 Cancelling subscription:", subscriptionId);

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    console.log("✅ Subscription cancelled successfully");

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end,
      },
    });
  } catch (error) {
    console.error("❌ Error cancelling subscription:", error.message);
    res.status(500).json({
      error: { message: "Failed to cancel subscription" },
    });
  }
});

// Create a webhook to handle events from Stripe
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("🔗 Webhook request received");

    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error("❌ Missing STRIPE_WEBHOOK_SECRET");
      return res.status(500).send("Webhook secret not configured");
    }

    let event;

    try {
      console.log("🔍 Validating webhook signature...");
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log("✅ Webhook signature validated");
      console.log("📋 Event type:", event.type);
    } catch (err) {
      console.error("❌ Webhook Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log("✅ Payment succeeded:", paymentIntent.id);
        console.log("📋 Payment details:");
        console.log("- Amount:", paymentIntent.amount);
        console.log("- Currency:", paymentIntent.currency);
        console.log("- Package ID:", paymentIntent.metadata.packageId);
        console.log("- Customer:", paymentIntent.metadata.customerName);
        // TODO: Update your database here to mark the booking as paid
        break;

      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        console.log("❌ Payment failed:", failedPayment.id);
        console.log("📋 Failure details:");
        console.log("- Last error:", failedPayment.last_payment_error);
        // TODO: Handle failed payment
        break;

      case "customer.subscription.created":
        const createdSubscription = event.data.object;
        console.log("📦 Subscription created:", createdSubscription.id);
        console.log("- Customer:", createdSubscription.customer);
        console.log("- Status:", createdSubscription.status);
        console.log("- User ID:", createdSubscription.metadata.userId);
        console.log("- Plan ID:", createdSubscription.metadata.planId);
        // TODO: Create subscription record in Firestore
        break;

      case "customer.subscription.updated":
        const updatedSubscription = event.data.object;
        console.log("📦 Subscription updated:", updatedSubscription.id);
        console.log("- Status:", updatedSubscription.status);
        console.log("- Cancel at period end:", updatedSubscription.cancel_at_period_end);
        // TODO: Update subscription record in Firestore
        break;

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object;
        console.log("📦 Subscription deleted:", deletedSubscription.id);
        // TODO: Mark subscription as cancelled in Firestore
        break;

      case "invoice.payment_succeeded":
        const paidInvoice = event.data.object;
        console.log("🧾 Invoice payment succeeded:", paidInvoice.id);
        console.log("- Subscription:", paidInvoice.subscription);
        // TODO: Update subscription status to active
        break;

      case "invoice.payment_failed":
        const failedInvoice = event.data.object;
        console.log("🧾 Invoice payment failed:", failedInvoice.id);
        console.log("- Subscription:", failedInvoice.subscription);
        // TODO: Handle failed recurring payment
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  }
);

// Health check endpoint
app.get("/health", (req, res) => {
  console.log("🏥 Health check requested");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Unhandled error:");
  console.error("- Message:", error.message);
  console.error("- Stack:", error.stack);

  res.status(500).json({
    error: { message: "Internal server error" },
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION:");
  console.error("- Message:", error.message);
  console.error("- Stack:", error.stack);
  console.error("🔄 Server will exit...");
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED PROMISE REJECTION:");
  console.error("- Reason:", reason);
  console.error("- Promise:", promise);
  console.error("🔄 Server will exit...");
  process.exit(1);
});

// Handle SIGTERM (graceful shutdown)
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...");
  process.exit(0);
});

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully...");
  process.exit(0);
});

// Get local IP address
const nets = networkInterfaces();
const results = {};

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    if (net.family === 'IPv4' && !net.internal) {
      if (!results[name]) {
        results[name] = [];
      }
      results[name].push(net.address);
    }
  }
}

console.log("🎧 Starting server listener...");

app.listen(port, '0.0.0.0', () => {
  console.log("🎉 Server successfully started!");
  console.log(`🌐 Server running on port ${port}`);
  console.log("📱 Available on local network at:");
  Object.keys(results).forEach((interfaceName) => {
    results[interfaceName].forEach((ip) => {
      console.log(`   http://${ip}:${port}`);
    });
  });
  console.log(`🏥 Health check available at: http://localhost:${port}/health`);
  console.log("📝 Server logs will appear below:");
  console.log("─".repeat(50));
});
