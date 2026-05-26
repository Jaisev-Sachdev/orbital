const express = require('express');
const cors = require('cors');

const app = express();
// Uses the port from your .env file, or defaults to 3000
const PORT = process.env.PORT || 3000; 

// Middleware
app.use(cors()); // Crucial: Allows your Vite frontend (5173) to talk to this backend (3000)
app.use(express.json()); // Allows the server to read JSON data from requests

// The Health Check Route (from Page 4 of your team's guide)
app.get('/health', (req, res) => {
  res.json({ status: "ok", message: "Courseway API is running" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});