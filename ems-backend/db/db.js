import mongoose from 'mongoose'

const connectToDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected!");
    } catch (error) {
        console.log(`ERROR: Database connection error ${error}`);
        process.exit(1);
    }
}

export default connectToDatabase