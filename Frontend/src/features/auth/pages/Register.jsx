import React,{useState} from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Register = () => {

    const navigate = useNavigate()
    const [ username, setUsername ] = useState("")
    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")

    const {loading,handleRegister} = useAuth()
    
    const handleSubmit = async (e) => {
        e.preventDefault()
        const success = await handleRegister({username,email,password})
        if (success) navigate("/")
    }

    if(loading){
        return (<main className="auth-page"><h1>Loading...</h1></main>)
    }

    return (
        <main className="auth-page">
            <div className="auth-card">
                <Link to="/" className="brand-logo">CV Studio.</Link>
                <div className="auth-header">
                    <h1>Create Account</h1>
                    <p>Register to save your resumes and interview strategies to MongoDB.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Full Name or Username</label>
                        <input
                            onChange={(e) => { setUsername(e.target.value) }}
                            type="text"
                            id="username"
                            name='username'
                            placeholder='Alex Johnson'
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email"
                            id="email"
                            name='email'
                            placeholder='name@example.com'
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password"
                            id="password"
                            name='password'
                            placeholder='••••••••'
                            required
                        />
                    </div>

                    <button type="submit" className='button primary-button auth-btn'>Create Account</button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to={"/login"}>Sign In</Link>
                </div>
                <Link to="/" className="back-home">
                    ← Back to CV Studio
                </Link>
            </div>
        </main>
    )
}

export default Register