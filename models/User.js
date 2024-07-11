const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    xp: { type: Map, of: Number, default: {} }
});

module.exports = mongoose.model('User', userSchema);
