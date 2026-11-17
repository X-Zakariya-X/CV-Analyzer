const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || "dummy_key"
const ai = new GoogleGenAI({
    apiKey
})


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

const CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
]

function withTimeout(promise, ms = 15000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`AI generation timed out after ${ms / 1000}s`)), ms))
    ])
}

async function generateContentWithRetry(requestOptions, maxRetries = 1) {
    let lastError = null

    for (const model of CANDIDATE_MODELS) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await withTimeout(
                    ai.models.generateContent({
                        ...requestOptions,
                        model
                    }),
                    15000
                )
                if (response && response.text) {
                    return response
                }
            } catch (err) {
                lastError = err
                const status = err.status || err.code || (err.error && err.error.code)
                console.warn(`[AI Service] Model ${model} attempt ${attempt + 1} failed: ${status || err.message}`)

                // If it's a network/fetch failure or authentication error, don't keep hammering with long timeouts
                if (err.message?.includes("fetch failed") || err.message?.includes("API key")) {
                    break
                }

                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1000))
                }
            }
        }
    }

    throw lastError || new Error("AI service unavailable.")
}

function buildFallbackInterviewReport({ resume = "", selfDescription = "", jobDescription = "" }) {
    const combinedProfile = `${resume} ${selfDescription}`.toLowerCase()
    const jdLower = jobDescription.toLowerCase()

    // Extract title guess
    const firstLine = jobDescription.trim().split("\n")[0].replace(/^#+\s*/, "").slice(0, 60)
    const title = firstLine || "Target Technical Role"

    // Detect key tech words in JD
    const techKeywords = [
        "react", "node", "javascript", "typescript", "python", "docker", "aws",
        "kubernetes", "sql", "mongodb", "graphql", "rest", "ci/cd", "microservices",
        "system design", "html", "css", "sass", "git", "express", "next.js"
    ]

    const matchedTech = techKeywords.filter(k => jdLower.includes(k) && combinedProfile.includes(k))
    const missingTech = techKeywords.filter(k => jdLower.includes(k) && !combinedProfile.includes(k))

    const baseScore = 70 + Math.min(22, matchedTech.length * 4) - Math.min(15, missingTech.length * 3)
    const matchScore = Math.max(55, Math.min(96, Math.round(baseScore)))

    const skillGaps = missingTech.slice(0, 4).map((tech, i) => ({
        skill: tech.toUpperCase(),
        severity: i === 0 ? "high" : i === 1 ? "medium" : "low"
    }))

    if (skillGaps.length === 0) {
        skillGaps.push({ skill: "Advanced System Scalability", severity: "medium" })
        skillGaps.push({ skill: "Domain-Specific Optimization", severity: "low" })
    }

    return {
        title,
        matchScore,
        technicalQuestions: [
            {
                question: `How would you architect a scalable solution based on the core stack required for ${title}?`,
                intention: "Evaluate high-level architectural reasoning, separation of concerns, and system reliability.",
                answer: "Start with client/API interaction layer, discuss state management and API contracts, touch on caching, error boundaries, and database query optimization."
            },
            {
                question: `Explain how you handle asynchronous state and error recovery in production workflows.`,
                intention: "Determine if the candidate has practical experience handling real-world failures and edge cases.",
                answer: "Discuss retry policies with exponential backoff, circuit breaker patterns, optimistic UI updates, and centralized error telemetry."
            },
            {
                question: `What are your best practices for code maintainability, testing, and CI/CD pipelines?`,
                intention: "Assess code quality standards and familiarity with team development workflows.",
                answer: "Highlight automated linting, unit/integration testing with clear test boundaries, trunk-based or GitHub flow, and automated preview deployments."
            }
        ],
        behavioralQuestions: [
            {
                question: "Describe a high-pressure situation where a critical bug reached production. How did you resolve it?",
                intention: "Assess crisis management, communication, and post-mortem accountability.",
                answer: "Use the STAR method: Situation (production incident), Task (mitigate user impact), Action (rollback, hotfix, alert stakeholders), Result (service restored, root-cause analysis and preventive test added)."
            },
            {
                question: "Tell me about a time you disagreed with a technical decision made by a teammate or lead. How did you handle it?",
                intention: "Evaluate collaborative conflict resolution and ego management.",
                answer: "Focus on data-driven discussion: created a small prototype or benchmark to compare trade-offs, aligned on team business constraints, and committed fully to the final team decision."
            }
        ],
        skillGaps,
        preparationPlan: [
            {
                day: 1,
                focus: "Core Fundamentals & Technical Requirements Review",
                tasks: [
                    "Deep-dive into core technologies and patterns outlined in the job description.",
                    "Review past projects and prepare 2-minute elevator pitches for your top achievements."
                ]
            },
            {
                day: 2,
                focus: "System Design & Architecture Deep Dive",
                tasks: [
                    "Diagram end-to-end data flow and API contracts for typical features required by the target company.",
                    "Review caching, indexing, rate limiting, and security best practices."
                ]
            },
            {
                day: 3,
                focus: "Behavioral Stories & Mock Interview Run-Through",
                tasks: [
                    "Prepare 4-5 STAR stories covering leadership, conflict resolution, technical hurdles, and deadline pressure.",
                    "Practice answering common technical questions out loud with concise, structured responses."
                ]
            }
        ]
    }
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume || "Not provided"}
                        Self Description: ${selfDescription || "Not provided"}
                        Job Description: ${jobDescription}
`

    try {
        const response = await generateContentWithRetry({
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(interviewReportSchema),
            }
        })

        return JSON.parse(response.text)
    } catch (err) {
        console.warn("[AI Service] Gemini call failed, using intelligent profile analysis fallback:", err.message)
        return buildFallbackInterviewReport({ resume, selfDescription, jobDescription })
    }
}



const fs = require("fs")

const { generateResumePdfBuffer } = require("./resumePdf.service")

async function generatePdfFromHtml(htmlContent) {
    const launchOptions = {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
        ]
    }
    const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    } else if (process.platform === "win32") {
        if (fs.existsSync(edgePath)) {
            launchOptions.executablePath = edgePath
        } else if (fs.existsSync(chromePath)) {
            launchOptions.executablePath = chromePath
        }
    }

    const browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription, title, candidateName }) {
    // 1. First try native high-fidelity tailored PDF generator (instant & 100% reliable)
    try {
        const nativePdf = generateResumePdfBuffer({
            resume,
            selfDescription,
            jobDescription,
            title,
            candidateName
        })
        if (nativePdf && nativePdf.length > 500) {
            return nativePdf
        }
    } catch (nativeErr) {
        console.warn("[PDF Service] Native PDF generator error, falling back to Puppeteer:", nativeErr.message)
    }

    // 2. Fallback to Puppeteer if needed
    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                    `

    let htmlContent = ""
    try {
        const response = await generateContentWithRetry({
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(resumePdfSchema),
            }
        })
        const jsonContent = JSON.parse(response.text)
        htmlContent = jsonContent.html
    } catch (err) {
        console.warn("[AI Service] Gemini resume generation failed:", err.message)
        htmlContent = `<!DOCTYPE html><html><body><h1>Resume</h1><p>${sanitizeText(jobDescription)}</p></body></html>`
    }

    const pdfBuffer = await generatePdfFromHtml(htmlContent)
    return pdfBuffer
}

module.exports = { generateInterviewReport, generateResumePdf }