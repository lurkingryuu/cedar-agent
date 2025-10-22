"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface AttributeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: string
  namespace?: string
  onSuccess: () => void
}

const CEDAR_TYPES = [
  { value: "String", label: "String" },
  { value: "Long", label: "Long (Integer)" },
  { value: "Boolean", label: "Boolean" },
  // Add more types as backend supports them
  // { value: "Set", label: "Set" },
  // { value: "Record", label: "Record" },
]

export function AttributeDialog({ open, onOpenChange, entityType, namespace, onSuccess }: AttributeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [attributeName, setAttributeName] = useState("")
  const [attributeType, setAttributeType] = useState<string>("String")
  const [required, setRequired] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!attributeName.trim()) {
      toast.error("Attribute name is required")
      return
    }

    setLoading(true)

    try {
      await api.addEntityAttribute(
        entityType,
        attributeName.trim(),
        attributeType,
        required,
        namespace
      )
      toast.success(`Attribute "${attributeName}" added to ${entityType}`)
      onSuccess()
      onOpenChange(false)
      // Reset form
      setAttributeName("")
      setAttributeType("String")
      setRequired(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to add attribute")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Attribute to {entityType}</DialogTitle>
          <DialogDescription>
            Define a new attribute for the {entityType} entity type
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="attr-name">Attribute Name</Label>
              <Input
                id="attr-name"
                value={attributeName}
                onChange={(e) => setAttributeName(e.target.value)}
                placeholder="e.g., email, role, age"
                required
              />
              <p className="text-xs text-muted-foreground">
                Use camelCase or snake_case for attribute names
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attr-type">Data Type</Label>
              <Select
                value={attributeType}
                onValueChange={setAttributeType}
              >
                <SelectTrigger id="attr-type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {CEDAR_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cedar data type for this attribute
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={required}
                onCheckedChange={(checked) => setRequired(checked as boolean)}
              />
              <Label
                htmlFor="required"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Required attribute
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              If checked, all entities of this type must have this attribute
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Attribute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

