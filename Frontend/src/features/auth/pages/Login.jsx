import React,{useState} from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Login = () => {

    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        const success = await handleLogin({email,password})
        if (success) navigate('/')
    }

    if(loading){
        return (<main><h1>Loading.......</h1></main>)
    }


    return (
        <main className="auth-page">
            <div className="auth-card">
                <Link to="/" className="brand-logo">CV Studio.</Link>
                <div className="auth-header">
                    <h1>Sign In</h1>
                    <p>Enter your credentials to access your saved interview plans.</p>
                </div>
                <form onSubmit={handleSubmit}>
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
                    <button type="submit" className='button primary-button auth-btn'>Sign In</button>
                </form>
                <div className="auth-footer">
                    Don't have an account? <Link to={"/register"}>Create an account</Link>
                </div>
                <Link to="/" className="back-home">
                    ← Back to CV Studio
                </Link>
            </div>
        </main>
    )
}

export default Login