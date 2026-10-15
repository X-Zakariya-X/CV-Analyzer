import React, { useState, useRef, useEffect } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { useNavigate, Link } from 'react-router'

const LOADING_STEPS = [
    "Reading & extracting profile information...",
    "Analyzing target job requirements & competencies...",
    "Formulating technical interview questions & model answers...",
    "Crafting behavioral scenarios & evaluation criteria...",
    "Building personalized day-by-day road map..."
]

const formatFileSize = (bytes) => {
    if (!bytes) return "0 B"
    const k = 1024
    const sizes = [ "B", "KB", "MB", "GB" ]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

const Home = () => {
    const { loading, generateReport, reports } = useInterview()
    const { user, handleLogout } = useAuth()
    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ resumeFile, setResumeFile ] = useState(null)
    const [ isDragging, setIsDragging ] = useState(false)
    const [ error, setError ] = useState("")
    const [ activeStep, setActiveStep ] = useState(0)
    const [ showAuthModal, setShowAuthModal ] = useState(false)

    const resumeInputRef = useRef(null)
    const navigate = useNavigate()

    // Step cycle animation while loading
    useEffect(() => {
        if (!loading) {
            setActiveStep(0)
            return
        }
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % LOADING_STEPS.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [ loading ])

    const scrollToAnalyzer = () => {
        const el = document.getElementById('analyzer')
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' })
        }
    }

    const handleFileSelect = (file) => {
        if (!file) return
        setError("")

        // Gating: Require login to upload resume
        if (!user) {
            setShowAuthModal(true)
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError("File size exceeds 10MB limit. Please upload a smaller PDF.")
            return
        }

        const ext = file.name.split('.').pop().toLowerCase()
        if (ext !== 'pdf') {
            setError("Only PDF files (.pdf) are supported for resume extraction. You can also paste your background in Quick Self-Description.")
            return
        }

        setResumeFile(file)
    }

    const triggerFileInput = () => {
        if (!user) {
            setShowAuthModal(true)
            return
        }
        if (resumeInputRef.current) {
            resumeInputRef.current.click()
        }
    }

    const handleRemoveFile = (e) => {
        e.stopPropagation()
        setResumeFile(null)
        if (resumeInputRef.current) {
            resumeInputRef.current.value = ""
        }
    }

    const handleGenerateReport = async () => {
        setError("")

        // Gating: Must be logged in to generate and save to MongoDB
        if (!user) {
            setShowAuthModal(true)
            return
        }

        if (!jobDescription.trim()) {
            setError("Please paste the Target Job Description before generating.")
            return
        }

        if (!resumeFile && !selfDescription.trim()) {
            setError("Please upload your resume PDF or write a Quick Self-Description.")
            return
        }

        try {
            const data = await generateReport({
                jobDescription: jobDescription.trim(),
                selfDescription: selfDescription.trim(),
                resumeFile
            })

            if (data && data._id) {
                navigate(`/interview/${data._id}`)
            } else {
                setError("Unable to generate interview strategy. Please try again.")
            }
        } catch (err) {
            console.error("Error generating report:", err)
            const backendMsg = err.response?.data?.message
            setError(backendMsg || err.message || "Failed to generate interview strategy. Please try again.")
        }
    }

    if (loading) {
        return (
            <main className='loading-screen'>
                <div className='loading-card'>
                    <div className='loading-orb'>
                        <div className='loading-orb__inner'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                        </div>
                    </div>

                    <h2 className='loading-title'>Generating Strategy Report</h2>
                    <p className='loading-subtitle'>Analyzing your profile and matching against role requirements...</p>

                    <div className='loading-step-box'>
                        <div className='loading-step-indicator'>
                            <span className='step-pulse'></span>
                            <span className='step-text'>{LOADING_STEPS[activeStep]}</span>
                        </div>
                    </div>

                    <div className='loading-progress-bar'>
                        <div className='loading-progress-fill'></div>
                    </div>

                    <p className='loading-time-note'>Typically takes 15–30 seconds. Your results will be saved to MongoDB.</p>
                </div>
            </main>
        )
    }

    return (
        <div className='landing-page'>

            {/* Top Navigation Bar */}
            <nav className='landing-nav'>
                <div className='nav-container'>
                    <Link to='/' className='nav-brand'>
                        CV Studio.
                    </Link>

                    <div className='nav-links'>
                        <a href='#analyzer' className='nav-link'>Analyzer</a>
                        <a href='#methodology' className='nav-link'>Methodology</a>
                        {user && reports && reports.length > 0 && (
                            <a href='#reports' className='nav-link'>My Plans ({reports.length})</a>
                        )}
                    </div>

                    <div className='nav-actions'>
                        {user ? (
                            <div className='user-badge'>
                                <span className='user-name'>
                                    <span className='status-dot'></span>
                                    {user.username}
                                </span>
                                <button onClick={handleLogout} className='button outline-button nav-btn'>
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <div className='auth-buttons'>
                                <Link to='/login' className='button outline-button nav-btn'>
                                    Login
                                </Link>
                                <Link to='/register' className='button primary-button nav-btn'>
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className='hero-section'>
                <div className='hero-tag'>EDITORIAL &amp; HONEST FEEDBACK</div>
                <h1 className='hero-title'>
                    Thoughtful feedback <br />
                    <span className='hero-italic'>for your resume.</span>
                </h1>
                <p className='hero-description'>
                    A clean, distraction-free diagnostic for professionals who value typography, structure, and high-impact clarity.
                </p>

                <button onClick={scrollToAnalyzer} className='hero-scroll-btn' aria-label='Scroll to analyzer'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <polyline points="19 12 12 19 5 12" />
                    </svg>
                </button>
            </header>

            {/* Methodology Section */}
            <section id='methodology' className='methodology-section'>
                <div className='section-label-center'>THE THREE PILLARS</div>
                <h2 className='methodology-title'>Precision strategy for competitive roles.</h2>
                <div className='methodology-grid'>
                    <div className='methodology-card'>
                        <span className='card-num'>01</span>
                        <h3>Job Alignment</h3>
                        <p>Scans the target job description to pinpoint exact technical competencies, required tooling, and core priorities.</p>
                    </div>
                    <div className='methodology-card'>
                        <span className='card-num'>02</span>
                        <h3>Simulated Questions</h3>
                        <p>Generates tailored technical and behavioral interview scenarios along with interviewer intention and model answers.</p>
                    </div>
                    <div className='methodology-card'>
                        <span className='card-num'>03</span>
                        <h3>Preparation Road Map</h3>
                        <p>Produces a customized day-by-day roadmap stored directly in your MongoDB account for sustained interview preparation.</p>
                    </div>
                </div>
            </section>

            {/* CV Analysis Workspace Section */}
            <section id='analyzer' className='workspace-section'>
                <div className='workspace-container'>
                    <div className='workspace-header'>
                        <div>
                            <h2 className='workspace-title'>CV ANALYSIS WORKSPACE</h2>
                            <p className='workspace-subtitle'>Upload PDF or plain text documents up to 10MB</p>
                        </div>
                        <div className='workspace-status'>
                            {user ? (
                                <span className='status-tag status-tag--connected'>
                                    <span className='status-dot'></span>
                                    Signed in as {user.username}
                                </span>
                            ) : (
                                <span className='status-tag status-tag--idle'>
                                    Status: Idle (Sign in to upload)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Unauthenticated Alert Banner */}
                    {!user && (
                        <div className='auth-notice-banner'>
                            <div className='notice-content'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <span>Sign in required: Please log in or register before uploading so your interview strategies are saved to MongoDB.</span>
                            </div>
                            <Link to='/login' className='notice-link'>
                                Sign In &rarr;
                            </Link>
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <div className='error-banner'>
                            <span className='error-banner__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </span>
                            <span className='error-banner__text'>{error}</span>
                            <button type='button' className='error-banner__close' onClick={() => setError("")}>
                                &times;
                            </button>
                        </div>
                    )}

                    {/* Main Workspace Card */}
                    <div className='interview-card'>
                        <div className='interview-card__body'>

                            {/* Left Panel - Job Description */}
                            <div className='panel panel--left'>
                                <div className='panel__header'>
                                    <span className='panel__icon'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                                    </span>
                                    <h2>Target Job Description</h2>
                                    <span className='badge badge--required'>Required</span>
                                </div>
                                <textarea
                                    value={jobDescription}
                                    onChange={(e) => { setJobDescription(e.target.value) }}
                                    className='panel__textarea'
                                    placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer requires proficiency in React, TypeScript, and large-scale system design...'`}
                                    maxLength={5000}
                                />
                                <div className='char-counter'>{jobDescription.length} / 5000 chars</div>
                            </div>

                            {/* Vertical Divider */}
                            <div className='panel-divider' />

                            {/* Right Panel - Profile & Resume Dropzone */}
                            <div className='panel panel--right'>
                                <div className='panel__header'>
                                    <span className='panel__icon'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    </span>
                                    <h2>Your Profile</h2>
                                </div>

                                {/* Upload Resume Section */}
                                <div className='upload-section'>
                                    <label className='section-label'>
                                        Upload Resume
                                        <span className='badge badge--best'>Best Results</span>
                                    </label>

                                    {resumeFile ? (
                                        <div className='file-card'>
                                            <div className='file-card__icon'>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                    <line x1="16" y1="13" x2="8" y2="13" />
                                                    <line x1="16" y1="17" x2="8" y2="17" />
                                                    <polyline points="10 9 9 9 8 9" />
                                                </svg>
                                            </div>
                                            <div className='file-card__info'>
                                                <span className='file-card__name' title={resumeFile.name}>
                                                    {resumeFile.name}
                                                </span>
                                                <div className='file-card__meta'>
                                                    <span>{formatFileSize(resumeFile.size)}</span>
                                                    <span className='file-card__status'>
                                                        <span className='status-dot'></span>
                                                        Ready for upload
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type='button'
                                                onClick={handleRemoveFile}
                                                className='file-card__remove-btn'
                                                title='Remove selected resume'
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            className={`dropzone ${isDragging ? 'dropzone--dragging' : ''}`}
                                            onDragOver={(e) => {
                                                e.preventDefault()
                                                setIsDragging(true)
                                            }}
                                            onDragLeave={(e) => {
                                                e.preventDefault()
                                                setIsDragging(false)
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault()
                                                setIsDragging(false)
                                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                    handleFileSelect(e.dataTransfer.files[0])
                                                }
                                            }}
                                            onClick={triggerFileInput}
                                        >
                                            <div className='dropzone__box-icon'>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="17 8 12 3 7 8" />
                                                    <line x1="12" y1="3" x2="12" y2="15" />
                                                    <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
                                                </svg>
                                            </div>
                                            <p className='dropzone__title'>Drag &amp; drop your file here</p>
                                            <p className='dropzone__subtitle'>or select a file directly from your system</p>
                                            <button
                                                type='button'
                                                className='button primary-button dropzone__btn'
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    triggerFileInput()
                                                }}
                                            >
                                                SELECT DOCUMENT
                                            </button>
                                            <input
                                                ref={resumeInputRef}
                                                hidden
                                                type='file'
                                                id='resume'
                                                name='resume'
                                                accept='.pdf'
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleFileSelect(e.target.files[0])
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* OR Divider */}
                                <div className='or-divider'><span>OR</span></div>

                                {/* Quick Self-Description */}
                                <div className='self-description'>
                                    <label className='section-label' htmlFor='selfDescription'>Quick Self-Description</label>
                                    <textarea
                                        value={selfDescription}
                                        onChange={(e) => { setSelfDescription(e.target.value) }}
                                        id='selfDescription'
                                        name='selfDescription'
                                        className='panel__textarea panel__textarea--short'
                                        placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                                    />
                                </div>

                                {/* Info Box */}
                                <div className='info-box'>
                                    <span className='info-box__icon'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                    </span>
                                    <p>Either a <strong>Resume PDF</strong> or a <strong>Self Description</strong> is required to generate your personalized plan.</p>
                                </div>
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className='interview-card__footer'>
                            <span className='footer-info'>AI-Powered Strategy Generation &bull; Approx 15–30s</span>
                            <button
                                onClick={handleGenerateReport}
                                className='button primary-button generate-btn'
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                GENERATE MY STRATEGY
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Reports List */}
            {reports && reports.length > 0 && (
                <section id='reports' className='recent-reports-section'>
                    <div className='workspace-container'>
                        <div className='section-label-center'>SAVED IN MONGODB</div>
                        <h2 className='recent-reports-title'>My Saved Interview Plans</h2>
                        <ul className='reports-list'>
                            {reports.map(report => (
                                <li key={report._id} className='report-item' onClick={() => navigate(`/interview/${report._id}`)}>
                                    <div className='report-top'>
                                        <h3>{report.title || 'Untitled Position'}</h3>
                                        <span className={`match-badge ${report.matchScore >= 80 ? 'match--high' : report.matchScore >= 60 ? 'match--mid' : 'match--low'}`}>
                                            {report.matchScore}% Match
                                        </span>
                                    </div>
                                    <p className='report-meta'>Generated on {new Date(report.createdAt).toLocaleDateString()}</p>
                                    <span className='view-report-link'>Open Strategy &rarr;</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {/* Auth Required Modal */}
            {showAuthModal && (
                <div className='auth-modal-backdrop' onClick={() => setShowAuthModal(false)}>
                    <div className='auth-modal' onClick={(e) => e.stopPropagation()}>
                        <button className='auth-modal__close' onClick={() => setShowAuthModal(false)}>
                            &times;
                        </button>
                        <div className='auth-modal__icon'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <h3 className='auth-modal__title'>Sign In to Upload &amp; Analyze</h3>
                        <p className='auth-modal__text'>
                            To upload your resume and generate a customized interview strategy, please log in. Your resume analysis and interview prep road map will be securely saved to your MongoDB account.
                        </p>
                        <div className='auth-modal__actions'>
                            <button
                                onClick={() => navigate('/login')}
                                className='button primary-button auth-modal__btn'
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className='button outline-button auth-modal__btn'
                            >
                                Create Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Footer */}
            <footer className='landing-footer'>
                <div className='footer-container'>
                    <div className='footer-brand'>
                        <span className='brand-title'>CV Studio.</span>
                        <p>Thoughtful feedback &amp; interview preparation for high-impact candidates.</p>
                    </div>
                    <div className='footer-links'>
                        <a href='#analyzer'>Analyzer</a>
                        <a href='#methodology'>Methodology</a>
                        <Link to='/login'>Sign In</Link>
                        <Link to='/register'>Register</Link>
                    </div>
                </div>
                <div className='footer-bottom'>
                    &copy; {new Date().getFullYear()} CV Studio. All rights reserved.
                </div>
            </footer>
        </div>
    )
}

export default Home