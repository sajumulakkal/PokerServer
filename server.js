const path = require("path");
const express = require("express");
const cors = require("cors"); // Added CORS support
const config = require("./config");
const configureMiddleware = require("./middleware");
const configureRoutes = require("./routes");
const socketio = require("socket.io");
const gameSocket = require("./socket/index");
const connectDB = require("./config/db"); 

const app = express();

// Enable CORS so the React frontend can talk to this server
app.use(cors({
  origin: "*", // Allows requests from any origin
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Crucial: Parse incoming JSON request bodies (fixes undefined req.body errors)
app.use(express.json());

// Trigger the database connection
console.log("Attempting to connect to MongoDB...");
connectDB().then(() => {
    console.log("Database connection sequence completed.");
}).catch(err => {
    console.error("Critical: Could not connect to database.");
});

configureMiddleware(app);

// Routes
configureRoutes(app);

// ---- AUTO PORT LOGIC ----
let port = Number(config.PORT) || 7778; // Set to your verified port
let server;

const startServer = () => {
  server = app
    .listen(port, () => {
      console.log(`Server is running on port ${port}`);
      // Socket.io
      const io = socketio(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });
      io.on("connect", (socket) => gameSocket.init(socket, io));
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        port++;
        startServer();
      } else {
        console.error("Server error:", err);
        process.exit(1);
      }
    });
};

startServer();

process.on("unhandledRejection", (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server?.close(() => process.exit(1));
});