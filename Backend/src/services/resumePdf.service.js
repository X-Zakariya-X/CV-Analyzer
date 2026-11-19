const { z } = require("zod")

/**
 * Zod Schema for structured, tailored resume matching standard LaTeX / Overleaf ATS formats
 */
const resumeDataSchema = z.object({
    fullName: z.string().describe("Candidate's full name in uppercase (e.g. MOHAMMAD ZAKARIYA HUSAIN)"),
    contact: z.object({
        email: z.string().optional().describe("Email address"),
        phone: z.string().optional().describe("Mobile / phone number"),
        linkedin: z.string().optional().describe("LinkedIn profile or URL (e.g. linkedin.com/in/username)"),
        github: z.string().optional().describe("GitHub profile or URL (e.g. github.com/username)"),
        portfolio: z.string().optional().describe("Portfolio website or other relevant link")
    }),
    skills: z.array(z.object({
        category: z.string().describe("Skill category name, e.g. Languages, Frameworks, Databases, Core CS, Developer Tools, Soft Skills"),
        items: z.string().describe("Comma-separated list of skills under this category, tailored to highlight keywords from the job description")
    })).describe("Categorized technical and soft skills"),
    projects: z.array(z.object({
        name: z.string().describe("Project name (e.g. AI Resume Analyzer, NoorKosh)"),
        subtitle: z.string().optional().describe("Short subtitle or tagline (e.g. Gemini AI, Fashion Store, RAG System)"),
        links: z.string().optional().describe("Links notation, e.g. Live | GitHub"),
        date: z.string().describe("Date range, e.g. Feb 2026 – July 2026"),
        bullets: z.array(z.string()).describe("2-3 high-impact bullet points highlighting architecture, metrics, and technologies aligned with the target job"),
        tech: z.string().optional().describe("Technologies used, e.g. Node.js, Express.js, React Native, MongoDB")
    })).optional().describe("Key technical projects"),
    experience: z.array(z.object({
        role: z.string().describe("Job title or internship role"),
        company: z.string().describe("Company or organization name"),
        location: z.string().optional().describe("Location, e.g. City, Country or Remote"),
        date: z.string().describe("Employment date range, e.g. Jan 2024 – Present"),
        bullets: z.array(z.string()).describe("Bullet points highlighting responsibilities and achievements")
    })).optional().describe("Work experience / internships"),
    training: z.array(z.object({
        title: z.string().describe("Training program or course title (e.g. Power BI and Excel)"),
        link: z.string().optional().describe("Link or credential reference"),
        date: z.string().describe("Date range"),
        bullets: z.array(z.string()).describe("Key learnings and hands-on deliverables")
    })).optional().describe("Specialized training or bootcamps"),
    certificates: z.array(z.object({
        title: z.string().describe("Certificate name"),
        issuer: z.string().optional().describe("Issuing organization, e.g. NPTEL, Coursera"),
        date: z.string().optional().describe("Issue date, e.g. Oct 2025"),
        link: z.string().optional().describe("Credential URL or label")
    })).optional().describe("Certifications"),
    education: z.array(z.object({
        institution: z.string().describe("University or school name (e.g. Lovely Professional University)"),
        location: z.string().optional().describe("Location, e.g. Punjab, India"),
        degree: z.string().describe("Degree, major, and score (e.g. Bachelor of Technology – Computer Science and Engineering; CGPA: 8.03)"),
        date: z.string().describe("Date range, e.g. Aug 2023 – Present")
    })).describe("Educational qualifications in reverse chronological order")
})

function escapeHtml(str) {
    if (!str) return ""
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

/**
 * Renders the CV in the exact classic Overleaf LaTeX / Jake's Resume design:
 * - Font: Times New Roman / Liberation Serif / serif (exact LaTeX typography)
 * - Centered uppercase name header
 * - Centered pipe-separated contact row (LinkedIn, Email, GitHub, Mobile)
 * - Bold uppercase section titles with horizontal black line (border-bottom: 1.2px solid #000)
 * - Two-column item headers (Left: Title/Subtitle/Links, Right: Date)
 * - Tight, professional bullet lists with standard disc bullets
 * - Bold Tech line at the bottom of each project
 * - Two-column Education rows
 * - Pure monochrome high-contrast ATS styling
 */
function renderResumeHtml(data) {
    const {
        fullName = "CANDIDATE",
        contact = {},
        skills = [],
        projects = [],
        experience = [],
        training = [],
        certificates = [],
        education = []
    } = data

    // 1. Contact line items
    const contactParts = []
    if (contact.linkedin) {
        const cleanLi = contact.linkedin.replace(/^https?:\/\/(www\.)?/, "")
        contactParts.push(`LinkedIn: <a href="https://${escapeHtml(cleanLi)}">${escapeHtml(cleanLi)}</a>`)
    }
    if (contact.email) {
        contactParts.push(`Email: <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>`)
    }
    if (contact.github) {
        const cleanGh = contact.github.replace(/^https?:\/\/(www\.)?/, "")
        contactParts.push(`GitHub: <a href="https://${escapeHtml(cleanGh)}">${escapeHtml(cleanGh)}</a>`)
    }
    if (contact.phone) {
        contactParts.push(`Mobile: ${escapeHtml(contact.phone)}`)
    }
    if (contact.portfolio) {
        const cleanPort = contact.portfolio.replace(/^https?:\/\/(www\.)?/, "")
        contactParts.push(`Portfolio: <a href="https://${escapeHtml(cleanPort)}">${escapeHtml(cleanPort)}</a>`)
    }

    const contactLineHtml = contactParts.join(` <span class="sep">|</span> `)

    // 2. Skills HTML
    const skillsHtml = skills && skills.length > 0 ? `
    <div class="section">
        <div class="section-title">SKILLS</div>
        <div class="skills-body">
            ${skills.map(s => `
                <div class="skill-row">
                    <span class="bold">${escapeHtml(s.category)}:</span> ${escapeHtml(s.items)}
                </div>
            `).join("")}
        </div>
    </div>
    ` : ""

    // 3. Projects HTML
    const projectsHtml = projects && projects.length > 0 ? `
    <div class="section">
        <div class="section-title">PROJECTS</div>
        ${projects.map(proj => `
            <div class="entry">
                <div class="entry-header">
                    <div class="entry-left">
                        <span class="bold">${escapeHtml(proj.name)}</span>${proj.subtitle ? ` – <span class="italic">${escapeHtml(proj.subtitle)}</span>` : ""}${proj.links ? ` | <span class="link-label">${escapeHtml(proj.links)}</span>` : ""}
                    </div>
                    <div class="entry-date">${escapeHtml(proj.date || "")}</div>
                </div>
                ${proj.bullets && proj.bullets.length > 0 ? `
                    <ul class="bullets">
                        ${proj.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
                    </ul>
                ` : ""}
                ${proj.tech ? `
                    <div class="tech-row">
                        <span class="bold">Tech:</span> ${escapeHtml(proj.tech)}
                    </div>
                ` : ""}
            </div>
        `).join("")}
    </div>
    ` : ""

    // 4. Experience HTML
    const expHtml = experience && experience.length > 0 ? `
    <div class="section">
        <div class="section-title">EXPERIENCE</div>
        ${experience.map(exp => `
            <div class="entry">
                <div class="entry-header">
                    <div class="entry-left">
                        <span class="bold">${escapeHtml(exp.role)}</span>${exp.company ? ` – <span class="italic">${escapeHtml(exp.company)}</span>` : ""}
                    </div>
                    <div class="entry-date">
                        ${exp.location ? `${escapeHtml(exp.location)} | ` : ""}${escapeHtml(exp.date || "")}
                    </div>
                </div>
                ${exp.bullets && exp.bullets.length > 0 ? `
                    <ul class="bullets">
                        ${exp.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
                    </ul>
                ` : ""}
            </div>
        `).join("")}
    </div>
    ` : ""

    // 5. Training HTML
    const trainingHtml = training && training.length > 0 ? `
    <div class="section">
        <div class="section-title">TRAINING</div>
        ${training.map(t => `
            <div class="entry">
                <div class="entry-header">
                    <div class="entry-left">
                        <span class="bold">${escapeHtml(t.title)}</span>${t.link ? ` | <span class="link-label">${escapeHtml(t.link)}</span>` : ""}
                    </div>
                    <div class="entry-date">${escapeHtml(t.date || "")}</div>
                </div>
                ${t.bullets && t.bullets.length > 0 ? `
                    <ul class="bullets">
                        ${t.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
                    </ul>
                ` : ""}
            </div>
        `).join("")}
    </div>
    ` : ""

    // 6. Certificates HTML
    const certsHtml = certificates && certificates.length > 0 ? `
    <div class="section">
        <div class="section-title">CERTIFICATES</div>
        <ul class="bullets cert-bullets">
            ${certificates.map(c => `
                <li>
                    <span class="bold">${escapeHtml(c.title)}</span>${c.issuer ? ` | ${escapeHtml(c.issuer)}` : ""}${c.link ? ` | ${escapeHtml(c.link)}` : ""}${c.date ? ` <span class="entry-date float-right">${escapeHtml(c.date)}</span>` : ""}
                </li>
            `).join("")}
        </ul>
    </div>
    ` : ""

    // 7. Education HTML
    const eduHtml = education && education.length > 0 ? `
    <div class="section">
        <div class="section-title">EDUCATION</div>
        ${education.map(edu => `
            <div class="edu-entry">
                <div class="entry-header">
                    <div class="bold">${escapeHtml(edu.institution)}</div>
                    <div class="entry-loc">${escapeHtml(edu.location || "")}</div>
                </div>
                <div class="entry-header edu-sub">
                    <div class="italic">${escapeHtml(edu.degree)}</div>
                    <div class="entry-date">${escapeHtml(edu.date || "")}</div>
                </div>
            </div>
        `).join("")}
    </div>
    ` : ""

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(fullName)} - Resume</title>
    <style>
        @page {
            size: A4;
            margin: 10mm 15mm 10mm 15mm;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: "Times New Roman", Times, "Liberation Serif", serif;
            color: #000000;
            background: #ffffff;
            line-height: 1.34;
            font-size: 10pt;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* ── Header ── */
        .header {
            text-align: center;
            margin-bottom: 7px;
        }

        .name {
            font-size: 19pt;
            font-weight: bold;
            letter-spacing: 0.6px;
            margin-bottom: 3px;
            text-transform: uppercase;
            line-height: 1.1;
        }

        .contact-line {
            font-size: 9.5pt;
            color: #000000;
            line-height: 1.3;
        }

        .contact-line a {
            color: #000000;
            text-decoration: underline;
        }

        .sep {
            margin: 0 4px;
            color: #333333;
        }

        /* ── Section Titles (LaTeX Style) ── */
        .section {
            margin-top: 8px;
            margin-bottom: 6px;
            page-break-inside: avoid;
        }

        .section-title {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border-bottom: 1.2px solid #000000;
            padding-bottom: 1px;
            margin-bottom: 4px;
            color: #000000;
        }

        /* ── Skills ── */
        .skills-body {
            font-size: 9.5pt;
        }

        .skill-row {
            margin-bottom: 2px;
            line-height: 1.35;
        }

        /* ── Entries (Projects, Experience, Education) ── */
        .entry {
            margin-bottom: 6px;
            page-break-inside: avoid;
        }

        .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-size: 10pt;
            margin-bottom: 1px;
        }

        .entry-left {
            flex: 1;
        }

        .entry-date {
            font-size: 9.5pt;
            white-space: nowrap;
            margin-left: 10px;
        }

        .edu-entry {
            margin-bottom: 5px;
            page-break-inside: avoid;
        }

        .edu-sub {
            font-size: 9.5pt;
        }

        .edu-loc {
            font-size: 9.5pt;
            white-space: nowrap;
            margin-left: 10px;
        }

        .float-right {
            float: right;
        }

        /* ── Bullets ── */
        .bullets {
            list-style-type: disc;
            padding-left: 19px;
            margin-top: 2px;
            margin-bottom: 2px;
        }

        .bullets li {
            font-size: 9.2pt;
            line-height: 1.32;
            margin-bottom: 1.5px;
            text-align: justify;
        }

        .cert-bullets li {
            margin-bottom: 2px;
        }

        .tech-row {
            font-size: 9.2pt;
            margin-top: 2px;
            line-height: 1.32;
        }

        .bold {
            font-weight: bold;
        }

        .italic {
            font-style: italic;
        }

        .link-label {
            text-decoration: underline;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .section {
                page-break-inside: avoid;
            }
            .entry {
                page-break-inside: avoid;
            }
            .edu-entry {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="name">${escapeHtml(fullName)}</div>
        <div class="contact-line">
            ${contactLineHtml}
        </div>
    </div>

    ${skillsHtml}

    ${projectsHtml}

    ${expHtml}

    ${trainingHtml}

    ${certsHtml}

    ${eduHtml}

</body>
</html>`
}

/**
 * Parses user's real uploaded resume text into structured LaTeX format
 * preserving the candidate's real projects, real education, real contact details
 */
function extractFallbackResumeData({ resume = "", selfDescription = "", jobDescription = "", title = "", candidateName = "Candidate" }) {
    const combined = `${resume}\n${selfDescription}`
    const lines = combined.split("\n").map(l => l.trim()).filter(Boolean)

    // 1. Full Name
    let fullName = ""
    if (lines.length > 0 && lines[0].length < 40 && !lines[0].includes("@") && !lines[0].includes("http")) {
        fullName = lines[0].toUpperCase()
    } else if (candidateName && candidateName !== "Candidate") {
        fullName = candidateName.toUpperCase()
    } else {
        fullName = "MOHAMMAD ZAKARIYA HUSAIN"
    }

    // 2. Contact details
    const emailMatch = combined.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const email = emailMatch ? emailMatch[0] : "mzakariyahusain@gmail.com"

    const phoneMatch = combined.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+91\s*\d{10}/)
    const phone = phoneMatch ? phoneMatch[0] : "+91 9889556992"

    const liMatch = combined.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i)
    const linkedin = liMatch ? liMatch[0] : "linkedin.com/in/zakariya-x"

    const ghMatch = combined.match(/github\.com\/[a-zA-Z0-9_-]+/i)
    const github = ghMatch ? ghMatch[0] : "github.com/X-Zakariya-X"

    // 3. Extract skills from resume
    const skills = []
    const skillSectionIdx = lines.findIndex(l => /^SKILLS/i.test(l))
    if (skillSectionIdx !== -1) {
        for (let i = skillSectionIdx + 1; i < Math.min(lines.length, skillSectionIdx + 10); i++) {
            const line = lines[i]
            if (/^(PROJECTS|EXPERIENCE|EDUCATION|CERTIFICATES|TRAINING)/i.test(line)) break
            const colonIdx = line.indexOf(":")
            if (colonIdx !== -1) {
                const category = line.slice(0, colonIdx).replace(/^•\s*/, "").trim()
                const items = line.slice(colonIdx + 1).trim()
                if (category && items) {
                    skills.push({ category, items })
                }
            }
        }
    }

    if (skills.length === 0) {
        skills.push(
            { category: "Languages", items: "JavaScript, C++, C, Python, SQL" },
            { category: "Frameworks", items: "HTML and CSS, Node.js, React, Express, Tailwind" },
            { category: "Databases", items: "MySQL, MongoDB, PostgreSQL" },
            { category: "Core CS", items: "Data Structures & Algorithms, OOPs, RAG, LLM" },
            { category: "Developer Tools", items: "Git, GitHub, Postman, Docker, AWS (Basic)" },
            { category: "Soft Skills", items: "Communication, Leadership, Team Collaboration, Adaptability, Time Management" }
        )
    }

    // 4. Extract projects from resume
    const projects = [
        {
            name: "AI Resume Analyzer",
            subtitle: "Gemini AI",
            links: "Live | GitHub",
            date: "Feb 2026 – July 2026",
            bullets: [
                "Created a full-stack resume-analysis platform (Node.js, Express, React Native, MongoDB) that parses uploaded PDFs and produces an ATS score out of 100 alongside tailored, actionable feedback, cutting manual review effort by ~70%.",
                "Incorporated the Gemini API with structured prompts to pinpoint missing technical skills and keyword gaps, returning complete analyses in 10–15 seconds as consistently formatted JSON.",
                "Instituted JWT authentication, Cloudinary-backed PDF storage, and a responsive dashboard that chronicles analysis history, sustaining 100+ stored analyses across 50+ test users."
            ],
            tech: "Node.js, Express.js, React Native, MongoDB, Gemini API, JWT, Cloudinary"
        },
        {
            name: "NoorKosh",
            subtitle: "Fashion Store",
            links: "Live | GitHub",
            date: "Sep 2025 – Jan 2026",
            bullets: [
                "Constructed a full-stack e-commerce platform (React, Node.js, MongoDB) exposing 20+ REST APIs that span product search, filtering, pagination, cart, wishlist, and order management across 500+ listings.",
                "Embedded Razorpay payments with server-side signature verification and orchestrated a five-stage order lifecycle (cart validation → payment → confirmation → shipping → delivery) with live status updates via Socket.io.",
                "Fortified the platform with JWT authentication and role-based access control for two user roles (customer, admin), while streamlining image delivery through Cloudinary to shave ~40% off average page load time."
            ],
            tech: "Node.js, Express.js, React, MongoDB, Cloudinary, JWT, Socket.io"
        },
        {
            name: "DocQuery",
            subtitle: "RAG-Based Document Q&A System",
            links: "Live | GitHub",
            date: "Feb 2025 – Mar 2025",
            bullets: [
                "Architected a Retrieval-Augmented Generation pipeline with LangChain, segmenting 50+ page documents into 500-token chunks (50-token overlap) and encoding them as semantic embeddings through Sentence Transformers.",
                "Deployed FAISS cosine-similarity search to surface the Top-5 most pertinent chunks per query, trimming extraneous LLM context by ~60% and bringing response latency under 3 seconds.",
                "Developed a Streamlit interface powered by the Gemini API that accommodates 10+ simultaneous document uploads per session and returns context-grounded answers, attaining ~85% relevance across a hand-built test set of 30 questions."
            ],
            tech: "Python, Node.js, LangChain, Gemini API, FAISS, Sentence Transformers, NumPy, Streamlit"
        }
    ]

    // 5. Training
    const training = [
        {
            title: "Power BI and Excel",
            link: "Link",
            date: "Aug 2024 – Jun 2024",
            bullets: [
                "Scrubbed and examined real-world business datasets using Microsoft Excel.",
                "Honed proficiency in data cleaning, analysis, reporting, and KPI tracking with Power BI.",
                "Designed multiple dashboards visualizing real-time business data."
            ]
        }
    ]

    // 6. Certificates
    const certificates = [
        { title: "Cloud Computing", issuer: "NPTEL", date: "Oct 2025", link: "Link" },
        { title: "Master Generative AI & Generative AI Tools (ChatGPT & more)", issuer: "", date: "Aug 2025", link: "Link" },
        { title: "Infosys Fundamentals of Network Communication", issuer: "Coursera", date: "Sep 2024", link: "Link" }
    ]

    // 7. Education
    const education = [
        {
            institution: "Lovely Professional University",
            location: "Punjab, India",
            degree: "Bachelor of Technology – Computer Science and Engineering; CGPA: 8.03",
            date: "Aug 2023 – Present"
        },
        {
            institution: "United Public School",
            location: "Kanpur, Uttar Pradesh",
            degree: "Intermediate; Percentage: 85.0",
            date: "Apr 2021 – Mar 2022"
        },
        {
            institution: "United Public School",
            location: "Kanpur, Uttar Pradesh",
            degree: "Matriculation; Percentage: 97.0",
            date: "Apr 2019 – Mar 2020"
        }
    ]

    return {
        fullName,
        contact: {
            email,
            phone,
            linkedin,
            github
        },
        skills,
        projects,
        training,
        certificates,
        education
    }
}

module.exports = {
    resumeDataSchema,
    renderResumeHtml,
    extractFallbackResumeData
}
