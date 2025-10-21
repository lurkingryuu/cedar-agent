"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Upload, Download } from "lucide-react"
import { api } from "@/lib/api"
import { Schema } from "@/lib/types"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export default function SchemaPage() {
  const [schema, setSchema] = useState<Schema | null>(null)
  const [loading, setLoading] = useState(true)
  const [schemaJson, setSchemaJson] = useState("")
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    fetchSchema()
  }, [])

  async function fetchSchema() {
    try {
      setLoading(true)
      const data = await api.getSchema()
      setSchema(data)
      setSchemaJson(JSON.stringify(data, null, 2))
    } catch (error) {
      toast.error("Failed to fetch schema")
      console.error(error)
      setSchema(null)
      setSchemaJson("")
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSchema() {
    try {
      const parsed = JSON.parse(schemaJson)
      await api.updateSchema(parsed)
      toast.success("Schema updated successfully")
      setEditing(false)
      fetchSchema()
    } catch (error: any) {
      toast.error(error.message || "Failed to update schema")
      console.error(error)
    }
  }

  async function handleDeleteSchema() {
    if (!confirm("Are you sure you want to delete the schema? This cannot be undone.")) {
      return
    }

    try {
      await api.deleteSchema()
      toast.success("Schema deleted successfully")
      fetchSchema()
    } catch (error) {
      toast.error("Failed to delete schema")
      console.error(error)
    }
  }

  function handleExportSchema() {
    if (!schema) return

    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cedar-schema.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Schema exported successfully")
  }

  function handleImportSchema(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const parsed = JSON.parse(json)
        setSchemaJson(JSON.stringify(parsed, null, 2))
        setEditing(true)
        toast.success("Schema loaded. Click Save to apply changes.")
      } catch (error) {
        toast.error("Invalid JSON file")
      }
    }
    reader.readAsText(file)
    e.target.value = "" // Reset input
  }

  function renderEntityTypes(namespace: string, entityTypes: Record<string, any>) {
    return (
      <div className="space-y-4">
        {Object.entries(entityTypes).map(([name, definition]) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="outline">{name}</Badge>
                {definition.memberOfTypes && definition.memberOfTypes.length > 0 && (
                  <span className="text-sm text-muted-foreground font-normal">
                    → {definition.memberOfTypes.join(", ")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {definition.shape?.attributes && Object.keys(definition.shape.attributes).length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Attributes:</div>
                  <div className="grid gap-2">
                    {Object.entries(definition.shape.attributes).map(([attrName, attrDef]: [string, any]) => (
                      <div key={attrName} className="flex items-center gap-2 text-sm p-2 rounded bg-secondary/50">
                        <span className="font-medium">{attrName}:</span>
                        <Badge variant="secondary" className="text-xs">{attrDef.type}</Badge>
                        {attrDef.required && <Badge variant="destructive" className="text-xs">required</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attributes defined</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  function renderActions(namespace: string, actions: Record<string, any>) {
    return (
      <div className="space-y-4">
        {Object.entries(actions).map(([name, definition]) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="text-lg">
                <Badge variant="outline">{name}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {definition.appliesTo ? (
                <div className="space-y-2 text-sm">
                  {definition.appliesTo.principalTypes && (
                    <div>
                      <span className="font-medium">Principals:</span>{" "}
                      {definition.appliesTo.principalTypes.map((type: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="ml-1 text-xs">{type}</Badge>
                      ))}
                    </div>
                  )}
                  {definition.appliesTo.resourceTypes && (
                    <div>
                      <span className="font-medium">Resources:</span>{" "}
                      {definition.appliesTo.resourceTypes.map((type: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="ml-1 text-xs">{type}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No restrictions</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2 flex-1">
          <FileText className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Schema</h1>
        </div>
        <div className="flex gap-2">
          <label htmlFor="import-schema">
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
          </label>
          <input
            id="import-schema"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportSchema}
          />
          <Button variant="outline" onClick={handleExportSchema} disabled={!schema}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !schema || Object.keys(schema).length === 0 ? (
          <Card>
            <CardContent className="text-center p-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No schema defined</h3>
              <p className="text-muted-foreground mb-4">
                Define your entity types and actions to get started
              </p>
              <Button onClick={() => setEditing(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Schema
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="visual" className="w-full">
            <TabsList>
              <TabsTrigger value="visual">Visual View</TabsTrigger>
              <TabsTrigger value="json">JSON Editor</TabsTrigger>
            </TabsList>

            <TabsContent value="visual" className="mt-4">
              {Object.entries(schema).map(([namespace, definition]) => (
                <div key={namespace} className="space-y-6">
                  {definition.entityTypes && Object.keys(definition.entityTypes).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Entity Types</CardTitle>
                        <CardDescription>Define the structure of entities in your system</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderEntityTypes(namespace, definition.entityTypes)}
                      </CardContent>
                    </Card>
                  )}

                  {definition.actions && Object.keys(definition.actions).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Define the actions that can be performed</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {renderActions(namespace, definition.actions)}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}

              <div className="flex gap-2 mt-6">
                <Button onClick={() => setEditing(true)}>
                  Edit Schema
                </Button>
                <Button variant="destructive" onClick={handleDeleteSchema}>
                  Delete Schema
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="json" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Schema JSON</CardTitle>
                  <CardDescription>
                    Edit the schema directly in JSON format
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={schemaJson}
                    onChange={(e) => {
                      setSchemaJson(e.target.value)
                      setEditing(true)
                    }}
                    className="font-mono text-sm h-96"
                    placeholder='{"": {"entityTypes": {}, "actions": {}}}'
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSchema} disabled={!editing}>
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSchemaJson(JSON.stringify(schema, null, 2))
                        setEditing(false)
                      }}
                      disabled={!editing}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

