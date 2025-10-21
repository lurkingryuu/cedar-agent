"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { Policy, PolicyScope, PolicyCondition } from "@/lib/types"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2 } from "lucide-react"

interface PolicyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy: Policy | null
  onSuccess: () => void
}

export function PolicyDialog({ open, onOpenChange, policy, onSuccess }: PolicyDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Policy>({
    id: "",
    effect: "permit",
    principal: { op: "All" },
    action: { op: "All" },
    resource: { op: "All" },
    conditions: [],
  })

  useEffect(() => {
    if (policy) {
      setFormData(policy)
    } else {
      setFormData({
        id: "",
        effect: "permit",
        principal: { op: "All" },
        action: { op: "All" },
        resource: { op: "All" },
        conditions: [],
      })
    }
  }, [policy, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (policy) {
        await api.updatePolicy(policy.id, formData)
        toast.success("Policy updated successfully")
      } else {
        await api.createPolicy(formData)
        toast.success("Policy created successfully")
      }
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to save policy")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function updateScope(field: 'principal' | 'action' | 'resource', op: string, entityType?: string, entityId?: string) {
    const scope: PolicyScope = { op: op as any }
    if (op !== "All" && entityType && entityId) {
      scope.entity = { type: entityType, id: entityId }
    }
    setFormData({ ...formData, [field]: scope })
  }

  function addCondition() {
    setFormData({
      ...formData,
      conditions: [...formData.conditions, { kind: "when", body: "" }],
    })
  }

  function updateCondition(index: number, field: keyof PolicyCondition, value: string) {
    const newConditions = [...formData.conditions]
    newConditions[index] = { ...newConditions[index], [field]: value }
    setFormData({ ...formData, conditions: newConditions })
  }

  function removeCondition(index: number) {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy ? "Edit Policy" : "Create Policy"}</DialogTitle>
          <DialogDescription>
            {policy ? "Update the policy details below" : "Fill in the details to create a new policy"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id">Policy ID</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="policy-1"
                  required
                  disabled={!!policy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effect">Effect</Label>
                <Select
                  value={formData.effect}
                  onValueChange={(value: "permit" | "forbid") => setFormData({ ...formData, effect: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permit">Permit</SelectItem>
                    <SelectItem value="forbid">Forbid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="action">Action</TabsTrigger>
                <TabsTrigger value="resource">Resource</TabsTrigger>
              </TabsList>

              <TabsContent value="principal" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select
                    value={formData.principal.op}
                    onValueChange={(value) => updateScope('principal', value, formData.principal.entity?.type, formData.principal.entity?.id)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="==">==(Equals)</SelectItem>
                      <SelectItem value="!=">!=(Not Equals)</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.principal.op !== "All" && (
                  <>
                    <div className="space-y-2">
                      <Label>Entity Type</Label>
                      <Input
                        value={formData.principal.entity?.type || ""}
                        onChange={(e) => updateScope('principal', formData.principal.op, e.target.value, formData.principal.entity?.id)}
                        placeholder="User"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Entity ID</Label>
                      <Input
                        value={formData.principal.entity?.id || ""}
                        onChange={(e) => updateScope('principal', formData.principal.op, formData.principal.entity?.type, e.target.value)}
                        placeholder="alice"
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="action" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select
                    value={formData.action.op}
                    onValueChange={(value) => updateScope('action', value, formData.action.entity?.type, formData.action.entity?.id)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="==">==(Equals)</SelectItem>
                      <SelectItem value="!=">!=(Not Equals)</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.action.op !== "All" && (
                  <>
                    <div className="space-y-2">
                      <Label>Entity Type</Label>
                      <Input
                        value={formData.action.entity?.type || ""}
                        onChange={(e) => updateScope('action', formData.action.op, e.target.value, formData.action.entity?.id)}
                        placeholder="Action"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Entity ID</Label>
                      <Input
                        value={formData.action.entity?.id || ""}
                        onChange={(e) => updateScope('action', formData.action.op, formData.action.entity?.type, e.target.value)}
                        placeholder="view"
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="resource" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select
                    value={formData.resource.op}
                    onValueChange={(value) => updateScope('resource', value, formData.resource.entity?.type, formData.resource.entity?.id)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="==">==(Equals)</SelectItem>
                      <SelectItem value="!=">!=(Not Equals)</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.resource.op !== "All" && (
                  <>
                    <div className="space-y-2">
                      <Label>Entity Type</Label>
                      <Input
                        value={formData.resource.entity?.type || ""}
                        onChange={(e) => updateScope('resource', formData.resource.op, e.target.value, formData.resource.entity?.id)}
                        placeholder="Document"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Entity ID</Label>
                      <Input
                        value={formData.resource.entity?.id || ""}
                        onChange={(e) => updateScope('resource', formData.resource.op, formData.resource.entity?.type, e.target.value)}
                        placeholder="doc1"
                      />
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conditions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Condition
                </Button>
              </div>
              {formData.conditions.map((condition, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Select
                      value={condition.kind}
                      onValueChange={(value: "when" | "unless") => updateCondition(index, "kind", value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="when">when</SelectItem>
                        <SelectItem value="unless">unless</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={condition.body}
                    onChange={(e) => updateCondition(index, "body", e.target.value)}
                    placeholder="context.time > 1609459200"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : policy ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

