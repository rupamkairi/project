// API client for ProjectX server

const API_BASE_URL = "http://localhost:3000";

// Types for Core Layer
export interface CoreLayer {
  id: string;
  name: string;
  description: string;
  types: string[];
  filePath: string;
}

export interface CoreLayerResponse {
  layers: CoreLayer[];
}

// Types for Module Layer
export interface ModuleLayer {
  id: string;
  version: string;
  dependsOn: string[];
  entities: string[];
  events: string[];
  commands: string[];
  queries: string[];
  fsms: string[];
  migrations: string[];
}

export interface ModuleLayerResponse {
  modules: ModuleLayer[];
}

// Types for Database Schemas
export interface DatabaseSchema {
  id: string;
  name: string;
  tables: string[];
  filePath: string;
}

export interface SchemasResponse {
  schemas: DatabaseSchema[];
}

// API Functions
export async function fetchCoreLayer(): Promise<CoreLayer[]> {
  const response = await fetch(`${API_BASE_URL}/core`);
  if (!response.ok) {
    throw new Error(`Failed to fetch core layer: ${response.statusText}`);
  }
  const data: CoreLayerResponse = await response.json();
  return data.layers;
}

export async function fetchModuleLayer(): Promise<ModuleLayer[]> {
  const response = await fetch(`${API_BASE_URL}/modules`);
  if (!response.ok) {
    throw new Error(`Failed to fetch modules: ${response.statusText}`);
  }
  const data: ModuleLayerResponse = await response.json();
  return data.modules;
}

export async function fetchSchemas(): Promise<DatabaseSchema[]> {
  const response = await fetch(`${API_BASE_URL}/schemas`);
  if (!response.ok) {
    throw new Error(`Failed to fetch schemas: ${response.statusText}`);
  }
  const data: SchemasResponse = await response.json();
  return data.schemas;
}

// Health check
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
