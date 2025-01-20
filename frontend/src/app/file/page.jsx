'use client'

import { useState, useEffect } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, File, Loader2 } from 'lucide-react'


export default function Files() {
  const [files, setFiles] = useState([])
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await axios.get("http://localhost:5000/list-files", {
          headers: { "x-access-token": token },
        })
        setFiles(response.data.files)
      } catch (error) {
        setMessage(error.response?.data.message || "Error fetching files!")
      } finally {
        setIsLoading(false)
      }
    }
    fetchFiles()
  }, [])

  const handleDownload = async (id) => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get(`http://localhost:5000/download-file/${id}`, {
        headers: { "x-access-token": token },
      })
      window.location.href = response.data.download_link
    } catch (error) {
      setMessage(error.response?.data.message || "Error downloading file!")
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto mt-20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Uploaded Files</CardTitle>
      </CardHeader>
      <CardContent>
        {message && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{message}</span>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : files.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {files.map((file) => (
              <li key={file.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <File className="h-6 w-6 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-900">{file.filename}</span>
                </div>
                <Button
                  onClick={() => handleDownload(file.id)}
                  size="sm"
                  className="ml-4"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8">
            <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded</h3>
            <p className="text-sm text-gray-500">Upload some files to see them listed here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

