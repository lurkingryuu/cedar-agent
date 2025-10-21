"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Edit, Database } from "lucide-react"
import { api } from "@/lib/api"
import { Entity } from "@/lib/types"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { EntityDialog } from "@/components/entity-dialog"
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

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entityToDelete, setEntityToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchEntities()
  }, [])

  async function fetchEntities() {
    try {
      setLoading(true)
      const data = await api.getEntities()
      setEntities(data)
    } catch (error) {
      toast.error("Failed to fetch entities")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(entityId: string) {
    try {
      await api.deleteSingleEntity(entityId)
      toast.success("Entity deleted successfully")
      fetchEntities()
    } catch (error) {
      toast.error("Failed to delete entity")
      console.error(error)
    } finally {
      setDeleteDialogOpen(false)
      setEntityToDelete(null)
    }
  }

  function openDeleteDialog(entityId: string) {
    setEntityToDelete(entityId)
    setDeleteDialogOpen(true)
  }

  function openEditDialog(entity: Entity) {
    setEditingEntity(entity)
    setDialogOpen(true)
  }

  function openCreateDialog() {
    setEditingEntity(null)
    setDialogOpen(true)
  }

  function getEntityIdentifier(entity: Entity): string {
    return `${entity.uid.type}::${entity.uid.id}`
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div className="flex items-center gap-2 flex-1">
          <Database className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Entities</h1>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entity
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Entity Store</CardTitle>
            <CardDescription>
              Manage entities, their attributes, and hierarchical relationships
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : entities.length === 0 ? (
              <div className="text-center p-8">
                <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No entities found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first entity
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entity
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Attributes</TableHead>
                      <TableHead>Parents</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entities.map((entity) => (
                      <TableRow key={getEntityIdentifier(entity)}>
                        <TableCell>
                          <Badge variant="outline">{entity.uid.type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{entity.uid.id}</TableCell>
                        <TableCell>
                          {Object.keys(entity.attrs).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(entity.attrs).map(([key, value]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key}: {JSON.stringify(value)}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No attributes</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entity.parents.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {entity.parents.map((parent, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {parent.type}::{parent.id}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No parents</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(entity)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(entity.uid.id)}
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

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entity={editingEntity}
        onSuccess={fetchEntities}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the entity "{entityToDelete}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => entityToDelete && handleDelete(entityToDelete)}
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

