"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings as SettingsIcon, Check } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { API_CONFIG } from "@/lib/config"

export default function SettingsPage() {
  const [apiConfig, setApiConfig] = useState({
    baseUrl: "",
    apiKey: "",
  })
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    // Load from localStorage or use defaults
    const storedBaseUrl = localStorage.getItem("CEDAR_API_BASE_URL")
    const storedApiKey = localStorage.getItem("CEDAR_API_KEY")

    setApiConfig({
      baseUrl: storedBaseUrl || API_CONFIG.baseUrl,
      apiKey: storedApiKey || API_CONFIG.apiKey,
    })
  }, [])

  function handleSave() {
    localStorage.setItem("CEDAR_API_BASE_URL", apiConfig.baseUrl)
    localStorage.setItem("CEDAR_API_KEY", apiConfig.apiKey)
    
    // Config will automatically read from localStorage on next API call
    setSaved(true)
    toast.success("Settings saved successfully. Changes will be applied to new API requests.")
  }

  function handleChange(field: string, value: string) {
    setApiConfig({ ...apiConfig, [field]: value })
    setSaved(false)
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2 flex-1">
          <SettingsIcon className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure the connection to your Cedar Agent API server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">API Base URL</Label>
                <Input
                  id="baseUrl"
                  type="url"
                  value={apiConfig.baseUrl}
                  onChange={(e) => handleChange("baseUrl", e.target.value)}
                  placeholder="http://localhost:8180/v1"
                />
                <p className="text-xs text-muted-foreground">
                  The base URL of your Cedar Agent API (including /v1)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiConfig.apiKey}
                  onChange={(e) => handleChange("apiKey", e.target.value)}
                  placeholder="your-api-key-here"
                />
                <p className="text-xs text-muted-foreground">
                  The authentication token for accessing the Cedar Agent API
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={saved}>
                  {saved ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setApiConfig({
                      baseUrl: API_CONFIG.baseUrl,
                      apiKey: API_CONFIG.apiKey,
                    })
                    setSaved(true)
                  }}
                  disabled={saved}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                You can also configure these settings using environment variables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-secondary rounded-lg font-mono">
                  <div>NEXT_PUBLIC_API_BASE_URL={API_CONFIG.baseUrl}</div>
                  <div>NEXT_PUBLIC_API_KEY=***</div>
                </div>
                <p className="text-muted-foreground">
                  Create a <code className="px-1 py-0.5 bg-secondary rounded">.env.local</code> file
                  in the frontend directory with these values. Environment variables take precedence over
                  settings saved here.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About Cedar Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Cedar Agent is an HTTP server that manages a policy store and data store, providing
                seamless integration with Cedar - a language for defining permissions as policies.
              </p>
              <div className="pt-2 space-y-1">
                <div><strong>Version:</strong> 1.0.0</div>
                <div><strong>API Documentation:</strong> Available at /swagger-ui/ and /rapidoc/</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

