const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const configureMiddleware = require("../../middleware");
const configureRoutes = require("../../routes");
const connectDB = require("../../config/db");

const app = express();

// VERY IMPORTANT FOR NETLIFY / SERVERLESS:
// Tells Express to read the real client IP from the X-Forwarded-For header
app.set('trust proxy', 1);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

connectDB().catch(err => console.error("Database connection error:", err));

configureMiddleware(app);
configureRoutes(app);

module.exports.handler = serverless(app);
