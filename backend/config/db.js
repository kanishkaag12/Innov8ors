const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGO_URI or MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected');
  } catch (error) {
    if (
      error?.code === 'ECONNREFUSED' &&
      (error?.syscall === 'querySrv' || error?.syscall === 'queryTxt')
    ) {
      console.error(
        'MongoDB DNS lookup failed. If you are using an Atlas SRV URI, switch to a direct mongodb:// URI or use an LTS Node version.'
      );
    }
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
