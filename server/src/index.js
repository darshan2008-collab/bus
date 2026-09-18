const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const { initSchema } = require('./config/database');
const { setupWebSocket } = require('./websocket/syncServer');

const authRoutes = require('./routes/auth');
const busRoutes = require('./routes/buses');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const facultyRoutes = require('./routes/faculty');
const reportRoutes = require('./routes/reports');
const importRoutes = require('./routes/import');

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'College Mobile Bus Attendance Backend API'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/import', importRoutes);

// Serve Frontend static assets in production (Render / Cloud deployment)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Setup Real-time WebSocket synchronization
setupWebSocket(server);

// Start server
const PORT = process.env.PORT || 5200;

async function startServer() {
  try {
    await initSchema();
    server.listen(PORT, () => {
      console.log(`[Server] Mobile Bus Attendance API listening on port ${PORT}`);
      console.log(`[Server] WebSocket sync endpoint active at ws://localhost:${PORT}/ws/sync`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
