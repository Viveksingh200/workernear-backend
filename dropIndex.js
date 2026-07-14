import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dropIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");
        
        const db = mongoose.connection.db;
        const collection = db.collection('users');
        
        // List indexes
        const indexes = await collection.indexes();
        console.log("Current indexes:", indexes.map(i => i.name));
        
        if (indexes.some(i => i.name === 'phone_1')) {
            console.log("Dropping phone_1 index...");
            await collection.dropIndex('phone_1');
            console.log("phone_1 index dropped successfully.");
        } else {
            console.log("phone_1 index does not exist.");
        }
        
    } catch (error) {
        console.error("Error dropping index:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
};

dropIndex();
