require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const { User, Message } = require('./models'); // අලුතින් හැදූ models.js එක

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// MongoDB සම්බන්ධ කිරීම
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected!"))
    .catch(err => console.log("❌ MongoDB Error:", err));

const PORT = 5000;

// API Endpoints (උදාහරණයක් ලෙස Register)
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();
        res.json({ success: true, message: 'Account created!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'User already exists or Server error' });
    }
});

// මැසේජ් යැවීම (Database එකට)
app.post('/api/messages/send', async (req, res) => {
    const { sender, receiver, text, type } = req.body;
    const newMsg = new Message({ sender, receiver, text, type, timestamp: new Date() });
    await newMsg.save();
    res.json({ success: true, message: newMsg });
});

// මැසේජ් ලබා ගැනීම (Database එකෙන්)
app.get('/api/messages/:user1/:user2', async (req, res) => {
    const { user1, user2 } = req.params;
    const msgs = await Message.find({
        $or: [
            { sender: user1, receiver: user2 },
            { sender: user2, receiver: user1 }
        ]
    }).sort({ timestamp: 1 });
    res.json(msgs);
});

// Socket.io
io.on('connection', (socket) => {
    socket.on('register', (username) => socket.join(username));
    // ... ඉතිරි WebRTC ලොජික් එක මෙතනට දාගන්න
});

server.listen(PORT, () => console.log(`🚀 VexChat Server running on port ${PORT}`));