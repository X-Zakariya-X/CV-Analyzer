import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import React from 'react'
import AuthLoading from "./AuthLoading";

const Protected = ({children}) => {
    const { loading,user } = useAuth()


    if(loading){
        return (
            <AuthLoading
                title="Authenticating Session..."
                subtitle="Securing your session and loading your dashboard..."
            />
        )
    }

    if(!user){
        return <Navigate to={'/login'} />
    }
    
    return children
}

export default Protected