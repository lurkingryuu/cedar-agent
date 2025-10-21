"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Edit, Shield } from "lucide-react"
import { api } from "@/lib/api"
import { Policy } from "@/lib/types"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { PolicyDialog } from "@/components/policy-dialog"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [policyToDelete, setPolicyToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchPolicies()
  }, [])

  async function fetchPolicies() {
    try {
      setLoading(true)
      const data = await api.getPolicies()
      setPolicies(data)
    } catch (error) {
      toast.error("Failed to fetch policies")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deletePolicy(id)
      toast.success("Policy deleted successfully")
      fetchPolicies()
    } catch (error) {
      toast.error("Failed to delete policy")
      console.error(error)
    } finally {
      setDeleteDialogOpen(false)
      setPolicyToDelete(null)
    }
  }

  function openDeleteDialog(id: string) {
    setPolicyToDelete(id)
    setDeleteDialogOpen(true)
  }

  function openEditDialog(policy: Policy) {
    setEditingPolicy(policy)
    setDialogOpen(true)
  }

  function openCreateDialog() {
    setEditingPolicy(null)
    setDialogOpen(true)
  }

  function formatScope(scope: any): string {
    if (scope.op === "All") return "All"
    if (!scope.entity) return scope.op
    return `${scope.op} ${scope.entity.type}::"${scope.entity.id}"`
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2 flex-1">
          <Shield className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Policies</h1>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Policy
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Authorization Policies</CardTitle>
            <CardDescription>
              Manage policies that control access to resources in your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : policies.length === 0 ? (
              <div className="text-center p-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No policies found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first authorization policy
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Policy
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Effect</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Conditions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell className="font-medium">{policy.id}</TableCell>
                        <TableCell>
                          <Badge variant={policy.effect === "permit" ? "default" : "destructive"}>
                            {policy.effect}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatScope(policy.principal)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatScope(policy.action)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {formatScope(policy.resource)}
                        </TableCell>
                        <TableCell>
                          {policy.conditions.length > 0 ? (
                            <Badge variant="outline">{policy.conditions.length}</Badge>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(policy)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(policy.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PolicyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        policy={editingPolicy}
        onSuccess={fetchPolicies}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the policy "{policyToDelete}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => policyToDelete && handleDelete(policyToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

