import React from 'react'
import '../auth.form.scss'

const AuthLoading = ({
    title = "Authenticating Session",
    subtitle = "Verifying your credentials and preparing your studio workspace..."
}) => {
    return (
        <main className="auth-page auth-loading-screen">
            <div className="auth-card auth-loading-card">
                <div className="brand-logo">CV Studio.</div>

                <div className="aesthetic-loader">
                    <div className="aesthetic-orb">
                        <div className="aesthetic-orb-core">
                            <span className="aesthetic-sparkle">✦</span>
                        </div>
                    </div>
                </div>

                <div className="auth-loading-text">
                    <h2 className="loading-headline">{title}</h2>
                    <p className="loading-desc">{subtitle}</p>
                </div>

                <div className="loading-pulse-dots">
                    <span className="dot dot-1"></span>
                    <span className="dot dot-2"></span>
                    <span className="dot dot-3"></span>
                </div>
            </div>
        </main>
    )
}

export default AuthLoading
