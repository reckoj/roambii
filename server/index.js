require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { networkInterfaces } = require("os");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const admin = require("firebase-admin");
const serviceAccount = require("./roambii-firebase-adminsdk-fbsvc-f24d84b7cc.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  })
);
app.use(bodyParser.json());

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

const validateAmount = (amount) => {
  const numAmount = Number(amount);
  return !isNaN(numAmount) && numAmount > 0;
};

app.post("/create-payment-intent", async (req, res) => {
  try {
    const {
      amount,
      currency,
      packageId,
      email,
      name,
      description,
      agentId,
      bookingId,
      hasActiveSubscription,
    } = req.body;

    // Validate core required parameters
    if (!amount || !currency || !packageId || !email || !name) {
      return res
        .status(400)
        .json({ error: { message: "Missing required parameters" } });
    }

    // Provide defaults for missing optional parameters
    const finalAgentId = agentId || "default-agent";
    const finalBookingId = bookingId || `booking_${Date.now()}`;
    const finalHasActiveSubscription = hasActiveSubscription || false;

    if (!validateAmount(amount)) {
      return res.status(400).json({ error: { message: "Invalid amount" } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: { message: "Invalid email format" } });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      description: description || `Payment for package ${packageId}`,
      metadata: {
        packageId,
        customerEmail: email,
        customerName: name,
        agentId: finalAgentId,
        bookingId: finalBookingId,
      },
      receipt_email: email,
      automatic_payment_methods: { enabled: true },
    });

    // Calculate and store platform earnings
    //the plform earning share percentage should be stored also meaning the 0.05 or 0.15 percent in the platform_earnings collection filed platformAmount
    const percentage = finalHasActiveSubscription ? 0.05 : 0.15;
    const platformAmount = Math.round(amount * percentage);

    await db.collection("platform_earnings").add({
      agentId: db.doc(`agents/${finalAgentId}`),
      amount: platformAmount,
      percentage,
      stripePaymentId: paymentIntent.id,
      bookingId: finalBookingId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    if (error.type === "StripeCardError") {
      return res.status(400).json({ error: { message: error.message } });
    }

    res
      .status(500)
      .json({ error: { message: "Failed to create payment intent" } });
  }
});

// ... all other endpoints remain unchanged

console.log("🎧 Starting server listener...");

app.listen(port, "0.0.0.0", () => {
  const nets = networkInterfaces();
  const results = {};
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        if (!results[name]) results[name] = [];
        results[name].push(net.address);
      }
    }
  }
  Object.keys(results).forEach((interfaceName) => {
    results[interfaceName].forEach((ip) => {
      console.log(`   http://${ip}:${port}`);
    });
  });
});
