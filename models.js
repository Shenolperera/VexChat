const mongoose = require('mongoose');

// User Schema - පරිශීලකයින් සඳහා
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

// Message Schema - මැසේජ් සඳහා
const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    text: String,
    type: String,
    fileUrl: String,
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    deletedForEveryone: { type: Boolean, default: false },
    deletedFor: [String],
    reactions: { type: Object, default: {} }
});

module.exports = {
    User: mongoose.model('User', userSchema),
    Message: mongoose.model('Message', messageSchema)
};