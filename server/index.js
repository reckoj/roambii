// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // Replace with your actual key

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

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

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      metadata: {
        packageId,
        customerEmail: email,
        customerName: name,
      },
      receipt_email: email,
    });
    // hhh?
    // Return the client secret to the client
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({
      error: { message: error.message || "Failed to create payment intent" },
    });
  }
});

// Create a webhook to handle events from Stripe
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_SECRET_KEY;

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
        // Update your database here to mark the booking as paid
        // You can access metadata like paymentIntent.metadata.packageId
        break;
      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        console.log("Payment failed:", failedPayment.id);
        // Handle failed payment
        break;
      // Add more event types as needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  }
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
