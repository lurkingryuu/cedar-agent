import { API_CONFIG, getHeaders } from './config';
import type {
  Entity,
  Policy,
  PolicyScope,
  PolicyCondition,
  Schema,
  AuthorizationRequest,
  AuthorizationResponse,
} from './types';

class CedarAgentAPI {
  // Use a getter to read the base URL dynamically from config
  // This ensures localStorage changes are picked up without requiring a page refresh
  private get baseUrl(): string {
    return API_CONFIG.baseUrl;
  }

  constructor() {
    // No initialization needed - baseUrl is now a getter
  }

  // Convert Cedar policy string back to structured Policy format
  private convertFromCedarPolicy(cedarPolicy: { id: string; content: string }): Policy {
    const content = cedarPolicy.content;
    
    // Parse effect (permit/forbid)
    const effect = content.startsWith('permit') ? 'permit' : 'forbid';
    
    // Parse principal
    let principal: PolicyScope = { op: "All" };
    if (content.includes('principal ==')) {
      const principalMatch = content.match(/principal == (\w+)::"([^"]+)"/);
      if (principalMatch) {
        principal = {
          op: "==",
          entity: { type: principalMatch[1], id: principalMatch[2] }
        };
      }
    } else if (content.includes('principal !=')) {
      const principalMatch = content.match(/principal != (\w+)::"([^"]+)"/);
      if (principalMatch) {
        principal = {
          op: "!=",
          entity: { type: principalMatch[1], id: principalMatch[2] }
        };
      }
    } else if (content.includes('principal in')) {
      const principalMatch = content.match(/principal in \[(\w+)::"([^"]+)"\]/);
      if (principalMatch) {
        principal = {
          op: "in",
          entity: { type: principalMatch[1], id: principalMatch[2] }
        };
      }
    }
    
    // Parse action
    let action: PolicyScope = { op: "All" };
    if (content.includes('action ==')) {
      const actionMatch = content.match(/action == Action::"([^"]+)"/);
      if (actionMatch) {
        action = {
          op: "==",
          entity: { type: "Action", id: actionMatch[1] }
        };
      }
    } else if (content.includes('action in')) {
      const actionMatch = content.match(/action in \[([^\]]+)\]/);
      if (actionMatch) {
        // Parse multiple actions from the array
        const actionsText = actionMatch[1];
        const actionIds = actionsText.match(/Action::"([^"]+)"/g)?.map(match => 
          match.replace(/Action::"([^"]+)"/, '$1')
        ) || [];
        
        if (actionIds.length > 0) {
          action = {
            op: "in",
            entities: actionIds.map(id => ({ type: "Action", id }))
          };
        }
      }
    }
    
    // Parse resource
    let resource: PolicyScope = { op: "All" };
    if (content.includes('resource ==')) {
      const resourceMatch = content.match(/resource == (\w+)::"([^"]+)"/);
      if (resourceMatch) {
        resource = {
          op: "==",
          entity: { type: resourceMatch[1], id: resourceMatch[2] }
        };
      }
    } else if (content.includes('resource !=')) {
      const resourceMatch = content.match(/resource != (\w+)::"([^"]+)"/);
      if (resourceMatch) {
        resource = {
          op: "!=",
          entity: { type: resourceMatch[1], id: resourceMatch[2] }
        };
      }
    } else if (content.includes('resource in')) {
      const resourceMatch = content.match(/resource in \[([^\]]+)\]/);
      if (resourceMatch) {
        // Parse multiple resources from the array
        const resourcesText = resourceMatch[1];
        const resourceMatches = resourcesText.match(/(\w+)::"([^"]+)"/g);
        
        if (resourceMatches && resourceMatches.length > 0) {
          // For now, we'll take the first resource type and all IDs
          const firstMatch = resourceMatches[0].match(/(\w+)::"([^"]+)"/);
          if (firstMatch) {
            const resourceType = firstMatch[1];
            const resourceIds = resourceMatches.map(match => {
              const idMatch = match.match(/(\w+)::"([^"]+)"/);
              return idMatch ? idMatch[2] : '';
            }).filter(id => id);
            
            resource = {
              op: "in",
              entities: resourceIds.map(id => ({ type: resourceType, id }))
            };
          }
        }
      }
    } else if (content.includes('resource not in')) {
      const resourceMatch = content.match(/resource not in \[([^\]]+)\]/);
      if (resourceMatch) {
        // Parse multiple resources from the array
        const resourcesText = resourceMatch[1];
        const resourceMatches = resourcesText.match(/(\w+)::"([^"]+)"/g);
        
        if (resourceMatches && resourceMatches.length > 0) {
          // For now, we'll take the first resource type and all IDs
          const firstMatch = resourceMatches[0].match(/(\w+)::"([^"]+)"/);
          if (firstMatch) {
            const resourceType = firstMatch[1];
            const resourceIds = resourceMatches.map(match => {
              const idMatch = match.match(/(\w+)::"([^"]+)"/);
              return idMatch ? idMatch[2] : '';
            }).filter(id => id);
            
            resource = {
              op: "not in",
              entities: resourceIds.map(id => ({ type: resourceType, id }))
            };
          }
        }
      }
    }
    
    // Parse conditions
    const conditions: PolicyCondition[] = [];
    if (content.includes('when {')) {
      const whenMatch = content.match(/when \{\s*([^}]+)\s*\}/);
      if (whenMatch) {
        conditions.push({
          kind: "when",
          body: whenMatch[1].trim()
        });
      }
    }
    if (content.includes('unless {')) {
      const unlessMatch = content.match(/unless \{\s*([^}]+)\s*\}/);
      if (unlessMatch) {
        conditions.push({
          kind: "unless",
          body: unlessMatch[1].trim()
        });
      }
    }
    
    return {
      id: cedarPolicy.id,
      effect,
      principal,
      action,
      resource,
      conditions
    };
  }

  // Convert structured Policy to Cedar policy string format
  private convertToCedarPolicy(policy: Policy): { id: string; content: string } {
    const { id, effect, principal, action, resource, conditions } = policy;
    
    // Build the Cedar policy string
    let policyString = `${effect}(\n`;
    
    // Principal
    if (principal.op === "All") {
      policyString += `  principal,\n`;
    } else if (principal.entities && (principal.op === "in" || principal.op === "not in")) {
      // Handle multiple principals for 'in' and 'not in' operators
      const principalList = principal.entities.map(entity => `${entity.type}::"${entity.id}"`).join(", ");
      policyString += `  principal ${principal.op} [${principalList}],\n`;
    } else if (principal.entity) {
      if (principal.op === "==") {
        policyString += `  principal == ${principal.entity.type}::"${principal.entity.id}",\n`;
      } else if (principal.op === "!=") {
        policyString += `  principal != ${principal.entity.type}::"${principal.entity.id}",\n`;
      } else if (principal.op === "in") {
        policyString += `  principal in [${principal.entity.type}::"${principal.entity.id}"],\n`;
      } else if (principal.op === "not in") {
        policyString += `  principal not in [${principal.entity.type}::"${principal.entity.id}"],\n`;
      }
    }
    
    // Action
    if (action.op === "All") {
      policyString += `  action,\n`;
    } else if (action.entities && action.op === "in") {
      // Handle multiple actions for 'in' operator only
      const actionList = action.entities.map(entity => `Action::"${entity.id}"`).join(", ");
      policyString += `  action ${action.op} [${actionList}],\n`;
    } else if (action.entity) {
      if (action.op === "==") {
        policyString += `  action == Action::"${action.entity.id}",\n`;
      } else if (action.op === "in") {
        policyString += `  action in [Action::"${action.entity.id}"],\n`;
      }
    }
    
    // Resource
    if (resource.op === "All") {
      policyString += `  resource\n`;
    } else if (resource.entities && (resource.op === "in" || resource.op === "not in")) {
      // Handle multiple resources for 'in' and 'not in' operators
      const resourceList = resource.entities.map(entity => `${entity.type}::"${entity.id}"`).join(", ");
      policyString += `  resource ${resource.op} [${resourceList}]\n`;
    } else if (resource.entity) {
      if (resource.op === "==") {
        policyString += `  resource == ${resource.entity.type}::"${resource.entity.id}"\n`;
      } else if (resource.op === "!=") {
        policyString += `  resource != ${resource.entity.type}::"${resource.entity.id}"\n`;
      } else if (resource.op === "in") {
        policyString += `  resource in [${resource.entity.type}::"${resource.entity.id}"]\n`;
      } else if (resource.op === "not in") {
        policyString += `  resource not in [${resource.entity.type}::"${resource.entity.id}"]\n`;
      }
    }
    
    // Add conditions
    if (conditions && conditions.length > 0) {
      policyString += `)\n`;
      conditions.forEach(condition => {
        if (condition.kind === "when") {
          policyString += `when {\n  ${condition.body}\n};\n`;
        } else if (condition.kind === "unless") {
          policyString += `unless {\n  ${condition.body}\n};\n`;
        }
      });
    } else {
      policyString += `);`;
    }
    
    return {
      id,
      content: policyString
    };
  }

  // Health Check
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
      });
      return response.status === 204;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Policy Management
  async getPolicies(): Promise<Policy[]> {
    const response = await fetch(`${this.baseUrl}/policies`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch policies');
    const cedarPolicies = await response.json();
    // Convert Cedar policies back to structured format for display
    return cedarPolicies.map((cedarPolicy: { id: string; content: string }) => 
      this.convertFromCedarPolicy(cedarPolicy)
    );
  }

  async getPolicy(id: string): Promise<Policy> {
    const response = await fetch(`${this.baseUrl}/policies/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch policy');
    const cedarPolicy = await response.json();
    // Convert Cedar policy back to structured format for display
    return this.convertFromCedarPolicy(cedarPolicy);
  }

  async createPolicy(policy: Policy): Promise<Policy> {
    // Convert structured policy to Cedar policy string
    const cedarPolicy = this.convertToCedarPolicy(policy);
    const response = await fetch(`${this.baseUrl}/policies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(cedarPolicy),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create policy: ${error}`);
    }
    const cedarResponse = await response.json();
    // Convert Cedar policy back to structured format for display
    return this.convertFromCedarPolicy(cedarResponse);
  }

  async updatePolicy(id: string, policy: Partial<Policy>): Promise<Policy> {
    // Convert structured policy to Cedar policy string
    const cedarPolicy = this.convertToCedarPolicy(policy as Policy);
    const response = await fetch(`${this.baseUrl}/policies/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(cedarPolicy),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update policy: ${error}`);
    }
    const cedarResponse = await response.json();
    // Convert Cedar policy back to structured format for display
    return this.convertFromCedarPolicy(cedarResponse);
  }

  async deletePolicy(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/policies/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete policy');
  }

  async updatePolicies(policies: Policy[]): Promise<Policy[]> {
    // Convert structured policies to Cedar policy strings
    const cedarPolicies = policies.map(policy => this.convertToCedarPolicy(policy));
    const response = await fetch(`${this.baseUrl}/policies`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(cedarPolicies),
    });
    if (!response.ok) throw new Error('Failed to update policies');
    const cedarResponse = await response.json();
    // Convert Cedar policies back to structured format for display
    return cedarResponse.map((cedarPolicy: { id: string; content: string }) => 
      this.convertFromCedarPolicy(cedarPolicy)
    );
  }

  // Entity/Data Management
  async getEntities(): Promise<Entity[]> {
    const response = await fetch(`${this.baseUrl}/data`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch entities');
    return response.json();
  }

  async updateEntities(entities: Entity[]): Promise<Entity[]> {
    const response = await fetch(`${this.baseUrl}/data`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(entities),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update entities: ${error}`);
    }
    return response.json();
  }

  async deleteAllEntities(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/data`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete entities');
  }

  async addEntity(entityId: string, entityType: string): Promise<Entity[]> {
    const response = await fetch(`${this.baseUrl}/data/entity`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ entity_id: entityId, entity_type: entityType }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add entity: ${error}`);
    }
    return response.json();
  }

  async updateSingleEntity(entityId: string, entity: Entity): Promise<Entity> {
    const response = await fetch(`${this.baseUrl}/data/single/${entityId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify([entity]),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update entity: ${error}`);
    }
    return response.json();
  }

  async deleteSingleEntity(entityId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/data/single/${entityId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete entity');
  }

  async updateAttribute(
    entityId: string,
    attributeName: string,
    attributeValue: any
  ): Promise<Entity> {
    const response = await fetch(`${this.baseUrl}/data/attribute`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        entity_id: entityId,
        attribute_name: attributeName,
        attribute_value: attributeValue,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update attribute: ${error}`);
    }
    return response.json();
  }

  async deleteAttribute(entityId: string, attributeName: string): Promise<Entity> {
    const response = await fetch(`${this.baseUrl}/data/attribute`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({
        entity_id: entityId,
        attribute_name: attributeName,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete attribute: ${error}`);
    }
    return response.json();
  }

  async patchEntityAttributes(
    entityType: string,
    entityId: string,
    attributes: Record<string, string>,
    parents?: Array<{ type: string; id: string }>
  ): Promise<Entity> {
    const body: any = {
      entity_type: entityType,
      entity_id: entityId,
      attributes: attributes,
    };
    
    if (parents && parents.length > 0) {
      body.parents = parents.map(p => ({ type: p.type, id: p.id }));
    }
    
    const response = await fetch(`${this.baseUrl}/data/entity/attributes`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update entity attributes: ${error}`);
    }
    return response.json();
  }

  // Schema Management
  async getSchema(): Promise<Schema> {
    const response = await fetch(`${this.baseUrl}/schema`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch schema');
    return response.json();
  }

  async updateSchema(schema: Schema): Promise<Schema> {
    const response = await fetch(`${this.baseUrl}/schema`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(schema),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update schema: ${error}`);
    }
    return response.json();
  }

  async deleteSchema(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/schema`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete schema');
  }

  async addUserAttribute(name: string, type: string, required: boolean): Promise<Schema> {
    const response = await fetch(`${this.baseUrl}/schema/user/attribute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, type, required }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add user attribute: ${error}`);
    }
    return response.json();
  }

  async addResourceAttribute(name: string, type: string, required: boolean): Promise<Schema> {
    const response = await fetch(`${this.baseUrl}/schema/resource/attribute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, type, required }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add resource attribute: ${error}`);
    }
    return response.json();
  }

  async deleteUserAttribute(attrName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/schema/user/attribute/${attrName}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete user attribute');
  }

  async deleteResourceAttribute(attrName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/schema/resource/attribute/${attrName}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete resource attribute');
  }

  async addEntityAttribute(
    entityType: string,
    attributeName: string,
    attributeType: string,
    required: boolean,
    namespace?: string
  ): Promise<Schema> {
    const response = await fetch(`${this.baseUrl}/schema/attribute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        entity_type: entityType,
        namespace: namespace || "",
        name: attributeName,
        attr_type: attributeType,
        required: required,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add attribute: ${error}`);
    }
    return response.json();
  }

  async deleteEntityAttribute(
    entityType: string,
    attributeName: string,
    namespace?: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/schema/attribute`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({
        entity_type: entityType,
        namespace: namespace || "",
        name: attributeName,
      }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete attribute: ${error}`);
    }
  }

  // Authorization
  async checkAuthorization(request: AuthorizationRequest): Promise<AuthorizationResponse> {
    // Convert EntityUid objects to strings for backend compatibility
    // Format: "Type::\"id\"" (with escaped quotes around the ID)
    const backendRequest = {
      principal: `${request.principal.type}::"${request.principal.id}"`,
      action: `${request.action.type}::"${request.action.id}"`,
      resource: `${request.resource.type}::"${request.resource.id}"`,
      context: request.context,
    };

    console.log('Sending authorization request:', backendRequest);

    const response = await fetch(`${this.baseUrl}/is_authorized`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(backendRequest),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Authorization check failed: ${error}`);
    }
    return response.json();
  }
}

export const api = new CedarAgentAPI();

