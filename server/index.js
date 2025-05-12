// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://roambii.com', 'https://www.roambii.com'] 
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json());

// Validate amount is a positive number
const validateAmount = (amount) => {
  const numAmount = Number(amount);
  return !isNaN(numAmount) && numAmount > 0;
};

// Create a payment intent
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency, packageId, email, name, description } = req.body;

    // Validate the required fields
    if (!amount || !currency || !packageId || !email || !name) {
      return res.status(400).json({
        error: { message: "Missing required parameters" },
      });
    }

    // Validate amount
    if (!validateAmount(amount)) {
      return res.status(400).json({
        error: { message: "Invalid amount" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: { message: "Invalid email format" },
      });
    }

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

    // Return the client secret to the client
    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id 
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        error: { message: error.message }
      });
    }
    
    res.status(500).json({
      error: { message: "Failed to create payment intent" }
    });
  }
});

// Create a webhook to handle events from Stripe
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return res.status(500).send("Webhook secret not configured");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log("Payment succeeded:", paymentIntent.id);
        // TODO: Update your database here to mark the booking as paid
        // You can access metadata like paymentIntent.metadata.packageId
        break;
      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        console.log("Payment failed:", failedPayment.id);
        // TODO: Handle failed payment
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  }
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
