"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { Entity, EntityUid, Schema } from "@/lib/types"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity: Entity | null
  onSuccess: () => void
}

export function EntityDialog({ open, onOpenChange, entity, onSuccess }: EntityDialogProps) {
  const [loading, setLoading] = useState(false)
  const [schema, setSchema] = useState<Schema | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [formData, setFormData] = useState<Entity>({
    uid: { type: "", id: "" },
    attrs: {},
    parents: [],
  })
  const [newAttrKey, setNewAttrKey] = useState("")
  const [newAttrValue, setNewAttrValue] = useState("")
  const [newAttrType, setNewAttrType] = useState<string>("")
  const [newParentType, setNewParentType] = useState("")
  const [newParentId, setNewParentId] = useState("")
  const [customAttributeName, setCustomAttributeName] = useState(false)

  // Extract entity types from schema and existing entities
  const entityTypesFromSchema = schema ? Object.values(schema).flatMap(ns => 
    ns.entityTypes ? Object.keys(ns.entityTypes) : []
  ) : []
  
  const existingEntityTypes = Array.from(new Set(entities.map(e => e.uid.type)))
  const allEntityTypes = Array.from(new Set([...entityTypesFromSchema, ...existingEntityTypes]))

  // Get entity IDs for a specific type
  const getEntityIdsForType = (type: string) => {
    return entities
      .filter(e => e.uid.type === type)
      .map(e => e.uid.id)
  }

  const parentIds = getEntityIdsForType(newParentType)

  // Get available attributes for the selected entity type from schema
  const getAttributesForEntityType = (entityType: string) => {
    if (!schema || !entityType) return {}
    
    for (const namespace of Object.values(schema)) {
      if (namespace.entityTypes && namespace.entityTypes[entityType]) {
        const shape = namespace.entityTypes[entityType].shape
        return shape?.attributes || {}
      }
    }
    return {}
  }

  const availableAttributes = getAttributesForEntityType(formData.uid.type)
  const availableAttrNames = Object.keys(availableAttributes)
  
  // Get the type of the currently selected attribute
  const selectedAttrType = newAttrKey && availableAttributes[newAttrKey] 
    ? availableAttributes[newAttrKey].type 
    : null

  // Parse value based on expected type
  const parseValueForType = (value: string, type: any): any => {
    if (!type || !value) return value
    
    const typeStr = typeof type === 'string' ? type : type.type || type
    
    try {
      switch (typeStr) {
        case 'Long':
          const num = parseInt(value, 10)
          if (isNaN(num)) throw new Error('Invalid number')
          return num
        case 'Boolean':
          if (value.toLowerCase() === 'true') return true
          if (value.toLowerCase() === 'false') return false
          throw new Error('Invalid boolean')
        case 'String':
          return value
        default:
          // Try to parse as JSON for complex types
          try {
            return JSON.parse(value)
          } catch {
            return value
          }
      }
    } catch (error) {
      throw new Error(`Invalid value for type ${typeStr}`)
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [schemaData, entitiesData] = await Promise.all([
          api.getSchema(),
          api.getEntities()
        ])
        setSchema(schemaData)
        setEntities(entitiesData)
      } catch (error) {
        console.error("Failed to load schema and entities:", error)
      }
    }
    
    if (open) {
      loadData()
    }

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
    setNewAttrType("")
    setNewParentType("")
    setNewParentId("")
    setCustomAttributeName(false)
  }, [entity, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (entity) {
        // Update existing entity using the new PATCH endpoint
        // Convert attribute values to strings for the API
        const stringAttributes: Record<string, string> = {}
        for (const [key, value] of Object.entries(formData.attrs)) {
          stringAttributes[key] = typeof value === 'string' ? value : JSON.stringify(value)
        }
        
        await api.patchEntityAttributes(
          formData.uid.type,
          formData.uid.id,
          stringAttributes,
          formData.parents
        )
        toast.success("Entity updated successfully")
      } else {
        // Create new entity - first add it, then update with attributes and parents
        await api.addEntity(formData.uid.id, formData.uid.type)
        
        // If there are attributes or parents, update the entity
        if (Object.keys(formData.attrs).length > 0 || formData.parents.length > 0) {
          const stringAttributes: Record<string, string> = {}
          for (const [key, value] of Object.entries(formData.attrs)) {
            stringAttributes[key] = typeof value === 'string' ? value : JSON.stringify(value)
          }
          
          await api.patchEntityAttributes(
            formData.uid.type,
            formData.uid.id,
            stringAttributes,
            formData.parents
          )
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
    if (!newAttrKey || !newAttrValue) return
    
    try {
      let value: any = newAttrValue
      
      // If we know the expected type from schema, validate and parse accordingly
      if (selectedAttrType) {
        value = parseValueForType(newAttrValue, selectedAttrType)
      } else {
        // Try to parse as JSON for complex types
        try {
          value = JSON.parse(newAttrValue)
        } catch {
          // Keep as string if not valid JSON
        }
      }

      setFormData({
        ...formData,
        attrs: { ...formData.attrs, [newAttrKey]: value },
      })
      setNewAttrKey("")
      setNewAttrValue("")
      setNewAttrType("")
      setCustomAttributeName(false)
      toast.success(`Attribute "${newAttrKey}" added`)
    } catch (error: any) {
      toast.error(error.message || "Invalid attribute value")
    }
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
                {entity ? (
                  <Input
                    id="type"
                    value={formData.uid.type}
                    disabled
                  />
                ) : allEntityTypes.length > 0 ? (
                  <Select
                    value={formData.uid.type}
                    onValueChange={(value) => setFormData({ ...formData, uid: { ...formData.uid, type: value } })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      {allEntityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="type"
                    value={formData.uid.type}
                    onChange={(e) => setFormData({ ...formData, uid: { ...formData.uid, type: e.target.value } })}
                    placeholder="User"
                    required
                  />
                )}
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
                {availableAttrNames.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {availableAttrNames.length} available from schema
                  </span>
                )}
              </div>
              
              {Object.entries(formData.attrs).length > 0 && (
                <div className="space-y-2 p-3 border rounded-lg">
                  {Object.entries(formData.attrs).map(([key, value]) => {
                    const attrDef = availableAttributes[key]
                    return (
                      <div key={key} className="flex items-center justify-between p-2 bg-secondary rounded">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{key}:</span>
                            {attrDef && (
                              <Badge variant="outline" className="text-xs">
                                {typeof attrDef.type === 'string' ? attrDef.type : (attrDef.type as any)?.type || 'Any'}
                              </Badge>
                            )}
                            {attrDef?.required && (
                              <Badge variant="destructive" className="text-xs">required</Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">{JSON.stringify(value)}</span>
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
                    )
                  })}
                </div>
              )}

              <div className="space-y-2">
                <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
                  {availableAttrNames.length > 0 && !customAttributeName ? (
                    <div className="space-y-1">
                      <Select
                        value={newAttrKey}
                        onValueChange={(value) => {
                          if (value === "__custom__") {
                            setCustomAttributeName(true)
                            setNewAttrKey("")
                          } else {
                            setNewAttrKey(value)
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select attribute" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAttrNames.filter(name => !formData.attrs[name]).map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__custom__">+ Custom attribute</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedAttrType && (
                        <p className="text-xs text-muted-foreground">
                          Type: {typeof selectedAttrType === 'string' ? selectedAttrType : (selectedAttrType as any).type || 'Any'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Input
                        placeholder="Attribute name"
                        value={newAttrKey}
                        onChange={(e) => setNewAttrKey(e.target.value)}
                      />
                      {availableAttrNames.length > 0 && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-4 p-0 text-xs"
                          onClick={() => {
                            setCustomAttributeName(false)
                            setNewAttrKey("")
                          }}
                        >
                          Choose from schema
                        </Button>
                      )}
                    </div>
                  )}
                  <Input
                    placeholder={
                      selectedAttrType 
                        ? `Value (${typeof selectedAttrType === 'string' ? selectedAttrType : (selectedAttrType as any).type || 'Any'})`
                        : 'Value'
                    }
                    value={newAttrValue}
                    onChange={(e) => setNewAttrValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAttribute())}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addAttribute}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {selectedAttrType && (
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const typeStr = typeof selectedAttrType === 'string' ? selectedAttrType : (selectedAttrType as any).type
                      switch (typeStr) {
                        case 'String': return 'Enter text value'
                        case 'Long': return 'Enter integer value'
                        case 'Boolean': return 'Enter true or false'
                        default: return 'Enter value as JSON if needed'
                      }
                    })()}
                  </p>
                )}
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
                {allEntityTypes.length > 0 ? (
                  <Select
                    value={newParentType}
                    onValueChange={(value) => {
                      setNewParentType(value)
                      setNewParentId("")
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Parent type" />
                    </SelectTrigger>
                    <SelectContent>
                      {allEntityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Parent type"
                    value={newParentType}
                    onChange={(e) => setNewParentType(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParent())}
                  />
                )}
                {parentIds.length > 0 && newParentType ? (
                  <Select
                    value={newParentId}
                    onValueChange={(value) => setNewParentId(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Parent ID" />
                    </SelectTrigger>
                    <SelectContent>
                      {parentIds.map((id) => (
                        <SelectItem key={id} value={id}>
                          {id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Parent ID"
                    value={newParentId}
                    onChange={(e) => setNewParentId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addParent())}
                  />
                )}
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

