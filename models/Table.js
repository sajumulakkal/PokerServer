const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
    tableId: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    limit: {
        type: Number,
        required: true,
    },
    maxPlayers: {
        type: Number,
        default: 9,
    },
    created: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Table', TableSchema);