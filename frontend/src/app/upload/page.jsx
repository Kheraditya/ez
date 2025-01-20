'use client'

import { useState } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, FileUp, Loader2, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function Upload() {
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError("")
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setError("Please select a file to upload.")
      return
    }

    setIsLoading(true)
    setMessage("")
    setError("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const token = localStorage.getItem("token")
      const response = await axios.post("http://localhost:5000/upload-file", formData, {
        headers: { "x-access-token": token, "Content-Type": "multipart/form-data" },
      })
      setMessage(response.data.message)
    } catch (error) {
      setError(error.response?.data.message || "Error uploading file!")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload}>
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              {file && (
                <div className="flex items-center justify-between p-2 bg-gray-100 rounded">
                  <span className="text-sm truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit" onClick={handleUpload} disabled={!file || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      {message && (
        <Alert className="fixed bottom-4 right-4 max-w-md">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

