const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    activeStatus: {
        type: String,
        default: 'online',
    },
    followers: {
        type: Number,
        default: 0,
    },
    friends: {
        type: Number,
        default: 0,
    },
    following: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    password: {
        type: String,
        required: true,
    },
    theme: {
        type: String,
        default: 'dark',
    }
});

module.exports = mongoose.model('User', UserSchema);