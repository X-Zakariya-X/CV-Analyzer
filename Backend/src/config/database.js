const mongoose = require("mongoose")

async function connectToDB() {
    try {
        if (!process.env.MONGO_URI) {
            console.error("FATAL: MONGO_URI environment variable is missing!")
            return
        }
        await mongoose.connect(process.env.MONGO_URI)
        console.log("Connected to Database")
    }
    catch (err) {
        console.error("MongoDB connection error:", err)
    }
}

module.exports = connectToDB