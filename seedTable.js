require('dotenv').config();
const mongoose = require('mongoose');
const Table = require('./models/Table');
const connectDB = require('./config/db');

const initialTables = [
    { tableId: 'table-1', name: 'Beginner Stakes', limit: 10, maxPlayers: 6 },
    { tableId: 'table-2', name: 'Intermediate Room', limit: 50, maxPlayers: 9 },
    { tableId: 'table-3', name: 'High Rollers', limit: 200, maxPlayers: 9 }
];

async function seedTables() {
    try {
        await connectDB();
        
        await Table.deleteMany({});
        console.log('Existing tables cleared.');

        const result = await Table.insertMany(initialTables);
        console.log('Tables seeded successfully:', result);

        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding tables:', error);
        mongoose.connection.close();
    }
}

seedTables();