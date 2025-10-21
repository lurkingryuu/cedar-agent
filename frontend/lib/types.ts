// Entity Types
export interface EntityUid {
  type: string;
  id: string;
}

export interface Entity {
  uid: EntityUid;
  attrs: Record<string, any>;
  parents: EntityUid[];
}

// Policy Types
export interface PolicyScope {
  op: '==' | '!=' | 'in' | 'not in' | 'All';
  entity?: EntityUid;
}

export interface PolicyCondition {
  kind: 'when' | 'unless';
  body: string;
}

export interface Policy {
  id: string;
  effect: 'permit' | 'forbid';
  principal: PolicyScope;
  action: PolicyScope;
  resource: PolicyScope;
  conditions: PolicyCondition[];
}

// Schema Types
export interface AttributeType {
  type: string;
  required: boolean;
}

export interface EntityTypeShape {
  type: string;
  attributes?: Record<string, AttributeType>;
}

export interface EntityType {
  shape?: EntityTypeShape;
  memberOfTypes?: string[];
}

export interface ActionType {
  appliesTo?: {
    principalTypes?: string[];
    resourceTypes?: string[];
  };
}

export interface Schema {
  [namespace: string]: {
    entityTypes?: Record<string, EntityType>;
    actions?: Record<string, ActionType>;
  };
}

// Authorization Types
export interface AuthorizationRequest {
  principal: EntityUid;
  action: EntityUid;
  resource: EntityUid;
  context?: Record<string, any>;
}

export interface AuthorizationResponse {
  decision: 'Allow' | 'Deny';
  diagnostics: {
    reason: string[];
    errors: string[];
  };
}

