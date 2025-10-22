"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Info } from "lucide-react"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ContextField {
  key: string
  value: string
  type: string
}

interface ContextBuilderProps {
  value: string
  onChange: (value: string) => void
  schemaContext?: Record<string, any>
}

// Map schema types to UI types
function getUITypeFromSchemaType(schemaType: any): { value: string; label: string; example: string } {
  if (typeof schemaType === 'string') {
    switch (schemaType) {
      case 'String':
        return { value: "String", label: "String", example: '"hello"' }
      case 'Long':
        return { value: "Long", label: "Long (Integer)", example: "12345" }
      case 'Boolean':
        return { value: "Boolean", label: "Boolean", example: "true" }
      default:
        return { value: "String", label: "String", example: '"hello"' }
    }
  } else if (typeof schemaType === 'object' && schemaType.type === 'Extension') {
    switch (schemaType.name) {
      case 'ipaddr':
        return { value: "ip", label: "IP Address", example: "192.168.1.1" }
      case 'datetime':
        return { value: "datetime", label: "Date/Time", example: "2024-01-01T00:00:00Z" }
      case 'decimal':
        return { value: "decimal", label: "Decimal", example: "123.45" }
      case 'duration':
        return { value: "duration", label: "Duration", example: "1h30m" }
      default:
        return { value: "String", label: "String", example: '"hello"' }
    }
  }
  return { value: "String", label: "String", example: '"hello"' }
}

export function ContextBuilder({ value, onChange, schemaContext }: ContextBuilderProps) {
  const [mode, setMode] = useState<"builder" | "json">("builder")
  const [fields, setFields] = useState<ContextField[]>([])
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")

  // Get available context fields from schema with their types
  const schemaContextFields = schemaContext ? Object.entries(schemaContext).map(([key, type]) => ({
    key,
    type: getUITypeFromSchemaType(type)
  })) : []

  function parseValueForType(value: string, type: string): any {
    try {
      switch (type) {
        case "String":
          return value
        case "Long":
          const num = parseInt(value, 10)
          if (isNaN(num)) throw new Error("Invalid number")
          return num
        case "Boolean":
          if (value.toLowerCase() === "true") return true
          if (value.toLowerCase() === "false") return false
          throw new Error("Invalid boolean")
        case "ip":
          // Return as extension format
          return { __extn: { fn: "ip", arg: value } }
        case "datetime":
          // Return as extension format
          return { __extn: { fn: "datetime", arg: value } }
        case "decimal":
          // Return as extension format
          return { __extn: { fn: "decimal", arg: value } }
        case "duration":
          // Return as extension format
          return { __extn: { fn: "duration", arg: value } }
        default:
          return value
      }
    } catch (error: any) {
      throw new Error(`Invalid value for type ${type}: ${error.message}`)
    }
  }

  function addField() {
    if (!newKey || !newValue) {
      toast.error("Both key and value are required")
      return
    }

    // Find the type for the selected field from schema
    const fieldInfo = schemaContextFields.find(f => f.key === newKey)
    if (!fieldInfo) {
      toast.error("Selected field not found in schema")
      return
    }

    try {
      const parsedValue = parseValueForType(newValue, fieldInfo.type.value)
      const newField: ContextField = { key: newKey, value: newValue, type: fieldInfo.type.value }
      const updatedFields = [...fields, newField]
      setFields(updatedFields)
      
      // Update JSON
      const contextObj: Record<string, any> = {}
      updatedFields.forEach(field => {
        contextObj[field.key] = parseValueForType(field.value, field.type)
      })
      onChange(JSON.stringify(contextObj, null, 2))
      
      // Reset
      setNewKey("")
      setNewValue("")
      toast.success(`Context field "${newKey}" added`)
    } catch (error: any) {
      toast.error(error.message || "Failed to add context field")
    }
  }

  function removeField(index: number) {
    const updatedFields = fields.filter((_, i) => i !== index)
    setFields(updatedFields)
    
    // Update JSON
    if (updatedFields.length === 0) {
      onChange("{}")
    } else {
      const contextObj: Record<string, any> = {}
      updatedFields.forEach(field => {
        contextObj[field.key] = parseValueForType(field.value, field.type)
      })
      onChange(JSON.stringify(contextObj, null, 2))
    }
  }

  function switchToJsonMode() {
    setMode("json")
  }

  function switchToBuilderMode() {
    try {
      // Try to parse existing JSON and populate fields
      if (value && value.trim() !== "{}" && value.trim() !== "") {
        const parsed = JSON.parse(value)
        const parsedFields: ContextField[] = []
        
        Object.entries(parsed).forEach(([key, val]) => {
          // Determine type from value
          let type = "String"
          let displayValue = String(val)
          
          if (typeof val === "number") {
            type = "Long"
            displayValue = String(val)
          } else if (typeof val === "boolean") {
            type = "Boolean"
            displayValue = String(val)
          } else if (typeof val === "object" && val !== null) {
            const extn = val as any
            if (extn.__extn) {
              type = extn.__extn.fn
              displayValue = extn.__extn.arg
            } else {
              displayValue = JSON.stringify(val)
            }
          }
          
          parsedFields.push({ key, value: displayValue, type })
        })
        
        setFields(parsedFields)
      }
      setMode("builder")
    } catch (error) {
      toast.error("Invalid JSON, please fix before switching to builder mode")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          Context
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Context provides additional information for the authorization request, such as IP address, time, or custom attributes.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "builder" ? "default" : "outline"}
            size="sm"
            onClick={switchToBuilderMode}
          >
            Builder
          </Button>
          <Button
            type="button"
            variant={mode === "json" ? "default" : "outline"}
            size="sm"
            onClick={switchToJsonMode}
          >
            JSON
          </Button>
        </div>
      </div>

      {mode === "builder" ? (
        <div className="space-y-3 p-4 border rounded-lg">
          {fields.length > 0 && (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{field.key}:</span>
                      <Badge variant="outline" className="text-xs">{field.type}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{field.value}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
              {schemaContextFields.length > 0 ? (
                <Select value={newKey} onValueChange={setNewKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {schemaContextFields.map((field) => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Field name (e.g., ip, time)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                />
              )}
              
              <Input
                placeholder={(() => {
                  const fieldInfo = schemaContextFields.find(f => f.key === newKey)
                  return fieldInfo ? fieldInfo.type.example : "Value"
                })()}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addField())}
                className="col-span-1"
              />
              
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {newKey && (() => {
                const fieldInfo = schemaContextFields.find(f => f.key === newKey)
                return fieldInfo ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {fieldInfo.type.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Example: {fieldInfo.type.example}
                    </span>
                  </div>
                ) : null
              })()}
            </div>
          </div>
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-32 p-3 font-mono text-sm border rounded-lg bg-background"
          placeholder='{"ip": "192.168.1.1", "time": 1609459200}'
        />
      )}
    </div>
  )
}

