const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../../../.env") })
require("dotenv").config({ path: path.join(__dirname, "../../.env") })
require("dotenv").config()

const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const fs = require("fs")

let puppeteer = null
function getPuppeteer() {
    if (!puppeteer) {
        puppeteer = require("puppeteer")
    }
    return puppeteer
}

function getAiClient() {
    const key = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY
    if (!key) {
        throw new Error("Missing GOOGLE_GENAI_API_KEY or GEMINI_API_KEY environment variable.")
    }
    return new GoogleGenAI({ apiKey: key })
}


// ── Zod Schema (sent to Gemini as responseSchema so it returns structured JSON) ──

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job description"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("A technical interview question tailored to the job description"),
        intention: z.string().describe("Why an interviewer would ask this question"),
        answer: z.string().describe("How the candidate should answer — key points, approach, and what to cover")
    })).describe("3 to 5 technical interview questions specific to the role, tech stack, and seniority level"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("A behavioral interview question"),
        intention: z.string().describe("What the interviewer is evaluating with this question"),
        answer: z.string().describe("How to answer using the STAR method — key points and structure")
    })).describe("2 to 3 behavioral interview questions relevant to the role"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("A skill from the job description that the candidate appears to lack"),
        severity: z.enum(["low", "medium", "high"]).describe("How critical this gap is for the role")
    })).describe("List of skill gaps between the candidate's profile and the job requirements"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number, strictly from 1 to 5"),
        focus: z.string().describe("The main theme or focus area for this day, tailored to the specific role"),
        tasks: z.array(z.string()).describe("2 to 4 concrete, actionable tasks for this day")
    })).describe("A 5-day interview preparation plan (Day 1 through Day 5). Each day MUST have a unique focus area tailored to the specific role, tech stack, and skill gaps. Do NOT use generic plans."),
    title: z.string().describe("The job title extracted from the job description"),
})


// ── Model list & retry logic ─────────────────────────────────────────────────

const CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest"
]

function withTimeout(promise, ms = 30000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`AI generation timed out after ${ms / 1000}s`)), ms))
    ])
}

async function generateContentWithRetry(requestOptions, maxRetries = 2) {
    let lastError = null

    for (const model of CANDIDATE_MODELS) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const ai = getAiClient()
                const response = await withTimeout(
                    ai.models.generateContent({
                        ...requestOptions,
                        model
                    }),
                    30000
                )
                if (response && response.text) {
                    console.log(`[AI Service] Successfully generated with model: ${model}`)
                    return response
                }
            } catch (err) {
                lastError = err
                const status = err.status || err.code || (err.error && err.error.code)
                console.warn(`[AI Service] Model ${model} attempt ${attempt + 1} failed: ${status || err.message}`)

                // Don't retry on auth errors
                if (err.message?.includes("API key")) {
                    throw err
                }

                // Don't retry on 404 (model not found) — move to next model
                if (status === 404) {
                    break
                }

                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
                }
            }
        }
    }

    throw lastError || new Error("All AI models failed. Please try again later.")
}


// ── Main: Generate Interview Report via Gemini API ───────────────────────────

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `You are an expert technical interviewer and career strategist.

Analyze the candidate's profile against the job description and generate a comprehensive, role-specific interview preparation report.

═══════════════════════════════════════════════
JOB DESCRIPTION:
${jobDescription}
═══════════════════════════════════════════════
CANDIDATE RESUME:
${resume || "Not provided"}
═══════════════════════════════════════════════
CANDIDATE SELF-DESCRIPTION:
${selfDescription || "Not provided"}
═══════════════════════════════════════════════

INSTRUCTIONS:
1. Extract the job title from the job description.
2. Calculate a matchScore (0–100) comparing the candidate's skills to the job requirements.
3. Identify specific skill gaps between the candidate and the job description.
4. Generate 3–5 technical interview questions that an interviewer would actually ask for THIS specific role and tech stack. Include the interviewer's intention and a model answer strategy.
5. Generate 2–3 behavioral questions relevant to the role's seniority and domain.
6. Create a TAILORED 5-DAY PREPARATION PLAN (Day 1 through Day 5):
   - Each day MUST have a UNIQUE, SPECIFIC focus directly related to the technologies and skills in the job description.
   - Each day MUST have 2–4 concrete, actionable tasks.
   - The plan must be DIFFERENT for different roles. For example:
     * A React Frontend role should cover: component patterns, state management, performance/Web Vitals, testing, and mock interviews.
     * A Python Backend role should cover: API design, database optimization, distributed systems, containerization, and system design practice.
     * A DevOps role should cover: cloud architecture, Kubernetes, IaC/Terraform, observability, and incident response.
   - Do NOT produce a generic plan. Tailor every day to the actual job description provided.
`

    const response = await generateContentWithRetry({
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    const report = JSON.parse(response.text)

    // Validate the response has the expected structure
    if (!report.preparationPlan || !Array.isArray(report.preparationPlan)) {
        throw new Error("AI response missing preparationPlan")
    }

    if (!report.title) {
        report.title = "Interview Preparation Report"
    }

    if (typeof report.matchScore !== "number") {
        report.matchScore = 70
    }

    return report
}


// ── PDF Generation (Tailored AI Resume with Vector-Embedded Fonts) ──────────

const {
    resumeDataSchema,
    renderResumeHtml,
    extractFallbackResumeData
} = require("./resumePdf.service")

async function generatePdfFromHtml(htmlContent) {
    const launchOptions = {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--font-render-hinting=medium"
        ]
    }
    const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    } else if (process.platform === "win32") {
        if (fs.existsSync(chromePath)) {
            launchOptions.executablePath = chromePath
        } else if (fs.existsSync(edgePath)) {
            launchOptions.executablePath = edgePath
        }
    }

    const pptr = getPuppeteer()
    const browser = await pptr.launch(launchOptions)
    try {
        const page = await browser.newPage()
        await page.setContent(htmlContent, { waitUntil: [ "domcontentloaded", "load" ] })
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "10mm",
                bottom: "10mm",
                left: "15mm",
                right: "15mm"
            }
        })
        return pdfBuffer
    } finally {
        await browser.close()
    }
}

async function generateResumePdf({ resume, selfDescription, jobDescription, title, candidateName }) {
    const prompt = `You are an expert resume writer specializing in ATS-optimized LaTeX/Overleaf academic and tech resumes.
Tailor the candidate's resume for the target job while preserving their authentic background, projects, education, and links.

TARGET JOB DESCRIPTION:
${jobDescription}

TARGET TITLE:
${title || "Target Role"}

CANDIDATE NAME:
${candidateName && candidateName !== "Candidate" ? candidateName : "Extract real name from candidate resume or use Candidate"}

CANDIDATE RESUME / PROFILE:
${resume || "Not provided"}

CANDIDATE SELF-DESCRIPTION:
${selfDescription || "Not provided"}

INSTRUCTIONS:
1. Extract the candidate's exact full name (in UPPERCASE), contact info (LinkedIn, GitHub, Email, Mobile), education history, training, and projects.
2. In the SKILLS section, categorize skills (e.g. Languages, Frameworks, Databases, Core CS, Developer Tools, Soft Skills) and front-load keywords that directly match the target job description.
3. For each project, keep the real project name, links, and date. Refine and polish the 2-3 bullet points to highlight technical depth, measurable impact, and relevance to the target job description.
4. Keep the real education (institution, degree, CGPA/percentage, dates), training, and certificates.
5. Return strictly valid JSON conforming to the schema.
`

    let htmlContent = ""
    try {
        const response = await generateContentWithRetry({
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(resumeDataSchema),
            }
        })
        const resumeData = JSON.parse(response.text)
        htmlContent = renderResumeHtml(resumeData)
    } catch (err) {
        console.warn("[AI Service] Gemini resume tailoring failed, using profile extractor:", err.message)
        const fallbackData = extractFallbackResumeData({
            resume,
            selfDescription,
            jobDescription,
            title,
            candidateName
        })
        htmlContent = renderResumeHtml(fallbackData)
    }

    const pdfBuffer = await generatePdfFromHtml(htmlContent)
    return pdfBuffer
}

module.exports = { generateInterviewReport, generateResumePdf }
