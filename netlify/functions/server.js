const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const configureMiddleware = require("../../middleware");
const configureRoutes = require("../../routes");
const connectDB = require("../../config/db");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// Initialize DB connection - handle error gracefully WITHOUT process.exit()
connectDB().catch(err => {
  console.error("Database connection error:", err);
});

configureMiddleware(app);
configureRoutes(app);

module.exports.handler = serverless(app);
