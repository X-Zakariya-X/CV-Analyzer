const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL
].filter(Boolean)

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(null, true) // Or allow origin for seamless testing
        }
    },
    credentials: true
}))

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")


/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

/* serve static frontend files if built */
const path = require("path")
const fs = require("fs")
const possibleDistPaths = [
    path.join(__dirname, "../../Frontend/dist"),
    path.join(process.cwd(), "Frontend/dist"),
    path.join(process.cwd(), "../Frontend/dist")
]
const frontendDistPath = possibleDistPaths.find(p => fs.existsSync(p))
if (frontendDistPath) {
    app.use(express.static(frontendDistPath))
    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/")) {
            return next()
        }
        res.sendFile(path.join(frontendDistPath, "index.html"))
    })
}

module.exports = app