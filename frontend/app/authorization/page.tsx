"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"
import { AuthorizationRequest, AuthorizationResponse } from "@/lib/types"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

export default function AuthorizationPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuthorizationResponse | null>(null)
  const [formData, setFormData] = useState({
    principalType: "User",
    principalId: "",
    actionType: "Action",
    actionId: "",
    resourceType: "Document",
    resourceId: "",
    context: "{}",
  })

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      let contextObj = {}
      if (formData.context.trim()) {
        try {
          contextObj = JSON.parse(formData.context)
        } catch (error) {
          toast.error("Invalid JSON in context field")
          setLoading(false)
          return
        }
      }

      const request: AuthorizationRequest = {
        principal: {
          type: formData.principalType,
          id: formData.principalId,
        },
        action: {
          type: formData.actionType,
          id: formData.actionId,
        },
        resource: {
          type: formData.resourceType,
          id: formData.resourceId,
        },
        context: Object.keys(contextObj).length > 0 ? contextObj : undefined,
      }

      const response = await api.checkAuthorization(request)
      setResult(response)
      
      if (response.decision === "Allow") {
        toast.success("Authorization allowed")
      } else {
        toast.error("Authorization denied")
      }
    } catch (error: any) {
      toast.error(error.message || "Authorization check failed")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function loadExample(type: 'allowed' | 'denied') {
    if (type === 'allowed') {
      setFormData({
        principalType: "User",
        principalId: "alice",
        actionType: "Action",
        actionId: "view",
        resourceType: "Document",
        resourceId: "doc1",
        context: "{}",
      })
    } else {
      setFormData({
        principalType: "User",
        principalId: "bob",
        actionType: "Action",
        actionId: "delete",
        resourceType: "Document",
        resourceId: "doc1",
        context: "{}",
      })
    }
    setResult(null)
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2 flex-1">
          <CheckCircle className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Authorization</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Authorization</CardTitle>
              <CardDescription>
                Check if a specific action is permitted or denied based on your policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheck} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="principalType">Principal Type</Label>
                    <Input
                      id="principalType"
                      value={formData.principalType}
                      onChange={(e) => setFormData({ ...formData, principalType: e.target.value })}
                      placeholder="User"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="principalId">Principal ID</Label>
                    <Input
                      id="principalId"
                      value={formData.principalId}
                      onChange={(e) => setFormData({ ...formData, principalId: e.target.value })}
                      placeholder="alice"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="actionType">Action Type</Label>
                    <Input
                      id="actionType"
                      value={formData.actionType}
                      onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                      placeholder="Action"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="actionId">Action ID</Label>
                    <Input
                      id="actionId"
                      value={formData.actionId}
                      onChange={(e) => setFormData({ ...formData, actionId: e.target.value })}
                      placeholder="view"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="resourceType">Resource Type</Label>
                    <Input
                      id="resourceType"
                      value={formData.resourceType}
                      onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                      placeholder="Document"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resourceId">Resource ID</Label>
                    <Input
                      id="resourceId"
                      value={formData.resourceId}
                      onChange={(e) => setFormData({ ...formData, resourceId: e.target.value })}
                      placeholder="doc1"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context">Context (Optional JSON)</Label>
                  <Textarea
                    id="context"
                    value={formData.context}
                    onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                    placeholder='{"time": 1609459200, "ip": "192.168.1.1"}'
                    className="font-mono text-sm"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide additional context as JSON (leave empty if not needed)
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Checking..." : "Check Authorization"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadExample('allowed')}
                  >
                    Load Example (Allow)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadExample('denied')}
                  >
                    Load Example (Deny)
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {result && (
            <Card className={result.decision === "Allow" ? "border-green-500" : "border-red-500"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.decision === "Allow" ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Authorization Allowed
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      Authorization Denied
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  Decision based on current policies and data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Decision</Label>
                  <div className="mt-1">
                    <Badge
                      variant={result.decision === "Allow" ? "default" : "destructive"}
                      className="text-lg px-4 py-1"
                    >
                      {result.decision}
                    </Badge>
                  </div>
                </div>

                {result.diagnostics.reason.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Matching Policies</Label>
                    <div className="mt-2 space-y-1">
                      {result.diagnostics.reason.map((policyId, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Badge variant="outline">{policyId}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.diagnostics.errors.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      Errors
                    </Label>
                    <div className="mt-2 space-y-1">
                      {result.diagnostics.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.diagnostics.reason.length === 0 && result.decision === "Deny" && (
                  <div className="text-sm text-muted-foreground p-3 bg-secondary rounded">
                    No policies matched this request. By default, Cedar denies access when no policies permit it.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                The authorization check evaluates whether a principal (user or entity) can perform a specific action
                on a resource based on your Cedar policies.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Enter the principal (who is making the request)</li>
                <li>Specify the action they want to perform</li>
                <li>Identify the resource they want to access</li>
                <li>Optionally provide context for conditional policies</li>
              </ul>
              <p>
                Cedar will evaluate all policies and return either "Allow" or "Deny" along with the policies
                that contributed to the decision.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

