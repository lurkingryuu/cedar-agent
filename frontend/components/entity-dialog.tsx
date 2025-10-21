"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { Entity, EntityUid } from "@/lib/types"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface EntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity: Entity | null
  onSuccess: () => void
}

export function EntityDialog({ open, onOpenChange, entity, onSuccess }: EntityDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Entity>({
    uid: { type: "", id: "" },
    attrs: {},
    parents: [],
  })
  const [newAttrKey, setNewAttrKey] = useState("")
  const [newAttrValue, setNewAttrValue] = useState("")
  const [newParentType, setNewParentType] = useState("")
  const [newParentId, setNewParentId] = useState("")

  useEffect(() => {
    if (entity) {
      setFormData(entity)
    } else {
      setFormData({
        uid: { type: "", id: "" },
        attrs: {},
        parents: [],
      })
    }
    setNewAttrKey("")
    setNewAttrValue("")
    setNewParentType("")
    setNewParentId("")
  }, [entity, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (entity) {
        // Update existing entity
        await api.updateSingleEntity(entity.uid.id, formData)
        toast.success("Entity updated successfully")
      } else {
        // Create new entity - first add it, then update with attributes and parents
        await api.addEntity(formData.uid.id, formData.uid.type)
        
        // If there are attributes or parents, update the entity
        if (Object.keys(formData.attrs).length > 0 || formData.parents.length > 0) {
          const allEntities = await api.getEntities()
          const updatedEntities = allEntities.map(e => 
            e.uid.id === formData.uid.id && e.uid.type === formData.uid.type
              ? formData
              : e
          )
          await api.updateEntities(updatedEntities)
        }
        
        toast.success("Entity created successfully")
      }
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to save entity")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function addAttribute() {
    if (!newAttrKey) return
    
    let value: any = newAttrValue
    // Try to parse as JSON for complex types
    try {
      value = JSON.parse(newAttrValue)
    } catch {
      // Keep as string if not valid JSON
    }

    setFormData({
      ...formData,
      attrs: { ...formData.attrs, [newAttrKey]: value },
    })
    setNewAttrKey("")
    setNewAttrValue("")
  }

  function removeAttribute(key: string) {
    const newAttrs = { ...formData.attrs }
    delete newAttrs[key]
    setFormData({ ...formData, attrs: newAttrs })
  }

  function addParent() {
    if (!newParentType || !newParentId) return

    setFormData({
      ...formData,
      parents: [...formData.parents, { type: newParentType, id: newParentId }],
    })
    setNewParentType("")
    setNewParentId("")
  }

  function removeParent(index: number) {
    setFormData({
      ...formData,
      parents: formData.parents.filter((_, i) => i !== index),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entity ? "Edit Entity" : "Add Entity"}</DialogTitle>
          <DialogDescription>
            {entity ? "Update the entity details below" : "Fill in the details to add a new entity"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Entity Type</Label>
                <Input
                  id="type"
                  value={formData.uid.type}
                  onChange={(e) => setFormData({ ...formData, uid: { ...formData.uid, type: e.target.value } })}
                  placeholder="User"
                  required
                  disabled={!!entity}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id">Entity ID</Label>
                <Input
                  id="id"
                  value={formData.uid.id}
                  onChange={(e) => setFormData({ ...formData, uid: { ...formData.uid, id: e.target.value } })}
                  placeholder="alice"
                  required
                  disabled={!!entity}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Attributes</Label>
              </div>
              
              {Object.entries(formData.attrs).length > 0 && (
                <div className="space-y-2 p-3 border rounded-lg">
                  {Object.entries(formData.attrs).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-secondary rounded">
                      <div className="flex-1">
                        <span className="font-medium">{key}:</span>{" "}
                        <span className="text-muted-foreground">{JSON.stringify(value)}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttribute(key)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
                <Input
                  placeholder="Attribute name"
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAttribute())}
                />
                <Input
                  placeholder='Value (e.g., "text" or {"key": "value"})'
                  value={newAttrValue}
                  onChange={(e) => setNewAttrValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAttribute())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addAttribute}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Parents</Label>
              </div>
              
              {formData.parents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.parents.map((parent, index) => (
                    <Badge key={index} variant="outline" className="gap-2">
                      {parent.type}::{parent.id}
                      <button
                        type="button"
                        onClick={() => removeParent(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
                <Input
                  placeholder="Parent type"
                  value={newParentType}
                  onChange={(e) => setNewParentType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParent())}
                />
                <Input
                  placeholder="Parent ID"
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParent())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addParent}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : entity ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

