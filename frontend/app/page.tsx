"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Database, FileText, Activity } from "lucide-react"
import { api } from "@/lib/api"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    policies: 0,
    entities: 0,
    hasSchema: false,
    isHealthy: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [policies, entities, schema, health] = await Promise.all([
          api.getPolicies().catch(() => []),
          api.getEntities().catch(() => []),
          api.getSchema().catch(() => null),
          api.health(),
        ])

        setStats({
          policies: policies.length,
          entities: entities.length,
          hasSchema: schema !== null && Object.keys(schema).length > 0,
          isHealthy: health,
        })
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Welcome to Cedar Agent</h2>
          <p className="text-muted-foreground mt-2">
            Manage your policies, entities, and schemas all in one place
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Service Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {loading ? (
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
                ) : (
                  <div className={`h-2 w-2 rounded-full ${stats.isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
                )}
                <span className="text-2xl font-bold">
                  {loading ? "..." : stats.isHealthy ? "Healthy" : "Offline"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cedar Agent API status
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Policies</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats.policies}</div>
              <p className="text-xs text-muted-foreground">
                Active authorization policies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entities</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats.entities}</div>
              <p className="text-xs text-muted-foreground">
                Stored entities in database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Schema</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={loading ? "secondary" : stats.hasSchema ? "default" : "outline"}>
                  {loading ? "..." : stats.hasSchema ? "Configured" : "Not Set"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Entity type definitions
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="/policies"
                className="block p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="font-medium">Manage Policies</div>
                <div className="text-sm text-muted-foreground">
                  Create, update, and delete authorization policies
                </div>
              </a>
              <a
                href="/entities"
                className="block p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="font-medium">Manage Entities</div>
                <div className="text-sm text-muted-foreground">
                  Add and configure entities with attributes
                </div>
              </a>
              <a
                href="/authorization"
                className="block p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="font-medium">Test Authorization</div>
                <div className="text-sm text-muted-foreground">
                  Check if an action is permitted or denied
                </div>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Set up your Cedar Agent instance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium">
                  1
                </div>
                <div>
                  <div className="font-medium">Define Schema</div>
                  <div className="text-sm text-muted-foreground">
                    Set up entity types and actions
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium">
                  2
                </div>
                <div>
                  <div className="font-medium">Create Policies</div>
                  <div className="text-sm text-muted-foreground">
                    Define who can do what
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium">
                  3
                </div>
                <div>
                  <div className="font-medium">Add Entities</div>
                  <div className="text-sm text-muted-foreground">
                    Configure users, resources, and relationships
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
