const path = require("path");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const configureMiddleware = require("./middleware");
const configureRoutes = require("./routes");
const socketio = require("socket.io");
const gameSocket = require("./socket/index");
const connectDB = require("./config/db"); 

const app = express();

// Trust Railway proxy headers
app.set('trust proxy', true);

// Enable CORS so the React frontend can talk to this server
app.use(cors({
  origin: "*", // Allows requests from any origin
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Crucial: Parse incoming JSON request bodies
app.use(express.json());

// Trigger the database connection
console.log("Attempting to connect to MongoDB...");
connectDB().then(() => {
    console.log("Database connection sequence completed.");
}).catch(err => {
    console.error("Critical: Could not connect to database:", err);
});

configureMiddleware(app);

// Routes
configureRoutes(app);

// Use Railway's environment PORT first, falling back to config or 7778
const PORT = process.env.PORT || config.PORT || 7778;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Configure Socket.io with ping timeouts suitable for production
  const io = socketio(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Attach game socket listeners
  io.on("connection", (socket) => {
    console.log(`New socket connection: ${socket.id}`);
    gameSocket.init(socket, io);
  });
});

server.on("error", (err) => {
  console.error("Server startup error:", err);
});

// Prevent background errors from killing the Railway process
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection caught (process kept alive):", err);
});
