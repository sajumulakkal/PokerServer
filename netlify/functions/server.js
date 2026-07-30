const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const configureMiddleware = require("../../middleware");
const configureRoutes = require("../../routes");
const connectDB = require("../../config/db");

const app = express();

// Enable CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB (Netlify reuses cold start connections)
connectDB().catch(err => console.error("Database connection error:", err));

configureMiddleware(app);
configureRoutes(app);

// Export serverless handler instead of app.listen()
module.exports.handler = serverless(app);
