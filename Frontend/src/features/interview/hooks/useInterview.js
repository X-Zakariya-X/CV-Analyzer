import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, downloadingResume, setDownloadingResume, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            if (response && response.interviewReport) {
                setReport(response.interviewReport)
                return response.interviewReport
            }
            throw new Error("Invalid response received from server")
        } catch (error) {
            console.error("Error generating report:", error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const getReportById = async (interviewId) => {
        setLoading(true)
        try {
            const response = await getInterviewReportById(interviewId)
            if (response && response.interviewReport) {
                setReport(response.interviewReport)
                return response.interviewReport
            }
            throw new Error("Report not found")
        } catch (error) {
            console.error("Error fetching report:", error)
            throw error
        } finally {
            setLoading(false)
        }
    }

    const getReports = async () => {
        setLoading(true)
        let response = null
        try {
            response = await getAllInterviewReports()
            setReports(response.interviewReports)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }

        return response.interviewReports
    }

    const getResumePdf = async (interviewReportId) => {
        setDownloadingResume(true)
        try {
            const blobData = await generateResumePdf({ interviewReportId })

            if (!blobData || blobData.size === 0) {
                throw new Error("Received empty PDF file from server")
            }

            const url = window.URL.createObjectURL(new Blob([ blobData ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            const safeTitle = (report?.title || "Tailored_Role").replace(/[^a-zA-Z0-9_-]/g, "_")
            link.setAttribute("download", `Updated_Resume_${safeTitle}.pdf`)
            document.body.appendChild(link)
            link.click()

            setTimeout(() => {
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
            }, 100)
            return true
        } catch (error) {
            console.error("Resume download error:", error)
            alert("Failed to download updated resume. Please try again.")
            return false
        } finally {
            setDownloadingResume(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId ])

    return { loading, downloadingResume, report, reports, generateReport, getReportById, getReports, getResumePdf }

}