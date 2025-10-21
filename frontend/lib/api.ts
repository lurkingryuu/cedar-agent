import { API_CONFIG, getHeaders } from './config';
import type {
  Entity,
  Policy,
  Schema,
  AuthorizationRequest,
  AuthorizationResponse,
} from './types';

class CedarAgentAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
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
    return response.json();
  }

  async getPolicy(id: string): Promise<Policy> {
    const response = await fetch(`${this.baseUrl}/policies/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch policy');
    return response.json();
  }

  async createPolicy(policy: Policy): Promise<Policy> {
    const response = await fetch(`${this.baseUrl}/policies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(policy),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create policy: ${error}`);
    }
    return response.json();
  }

  async updatePolicy(id: string, policy: Partial<Policy>): Promise<Policy> {
    const response = await fetch(`${this.baseUrl}/policies/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(policy),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update policy: ${error}`);
    }
    return response.json();
  }

  async deletePolicy(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/policies/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete policy');
  }

  async updatePolicies(policies: Policy[]): Promise<Policy[]> {
    const response = await fetch(`${this.baseUrl}/policies`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(policies),
    });
    if (!response.ok) throw new Error('Failed to update policies');
    return response.json();
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

  // Authorization
  async checkAuthorization(request: AuthorizationRequest): Promise<AuthorizationResponse> {
    const response = await fetch(`${this.baseUrl}/is_authorized`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Authorization check failed: ${error}`);
    }
    return response.json();
  }
}

export const api = new CedarAgentAPI();

