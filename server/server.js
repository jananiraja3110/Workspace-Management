const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const httpServer = http.createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Map userId → socketId for targeted pushes
const userSockets = new Map();

io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    if (userId) userSockets.set(String(userId), socket.id);
  });
  socket.on('disconnect', () => {
    for (const [uid, sid] of userSockets.entries()) {
      if (sid === socket.id) { userSockets.delete(uid); break; }
    }
  });
});

// Push a notification to a specific user in real-time
const pushNotification = (userId, payload) => {
  const sid = userSockets.get(String(userId));
  if (sid) io.to(sid).emit('notification', payload);
};

// Make io + pushNotification available to controllers
app.set('io', io);
app.set('pushNotification', pushNotification);

// Wire socket push into notification util
const { setPushFn } = require('./utils/createNotification');
setPushFn(pushNotification);

// Middleware
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://workspace.absolutedata.ai', 'https://www.workspace.absolutedata.ai']
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/credentials', require('./routes/credentialRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/payslips', require('./routes/payslipRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/standups', require('./routes/standupRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/shifts', require('./routes/shiftRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/activity-logs', require('./routes/activityLogRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/celebrations', require('./routes/celebrationRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/spaces',   require('./routes/spaceRoutes'));

// Error handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Create uploads directory
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
