require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const Stripe = require("stripe"); // add stripe

const app = express();
<<<<<<< HEAD
app.use(cors({
  origin: "https://sincut.vercel.app", //frontend url
}));
=======
app.use(
  cors({
    origin: "https://sincut.vercel.app", // frontend URL
  })
);
>>>>>>> 27fd5c7 (stripe and package)
app.use(express.json());

// ====== Razorpay Setup ======
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Razorpay order endpoint
app.post("/create-order", async (req, res) => {
  const { amount } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Stripe Setup ======
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe checkout session for international payments
app.post("/create-checkout-session", async (req, res) => {
  const { amount } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Donation" },
            unit_amount: amount * 100, // $1 → 100 cents
          },
          quantity: 1,
        },
      ],
      success_url: "https://sincut.vercel.app/success",
      cancel_url: "https://sincut.vercel.app/cancel",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Payment backend running on port ${PORT}`)
);
