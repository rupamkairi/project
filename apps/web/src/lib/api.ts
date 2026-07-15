// API client for ProjectX server

const configuredApiUrl: unknown = import.meta.env.VITE_API_URL
const API_BASE_URL =
  typeof configuredApiUrl === 'string' && configuredApiUrl.length > 0
    ? configuredApiUrl
    : 'http://localhost:10050'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

// Types for Core Layer
export interface CoreLayer {
  id: string
  name: string
  description: string
  types: string[]
  filePath: string
}

export interface CoreLayerResponse {
  layers: CoreLayer[]
}

// Types for Module Layer
export interface ModuleLayer {
  id: string
  version: string
  dependsOn: string[]
  entities: string[]
  events: string[]
  commands: string[]
  queries: string[]
  fsms: string[]
  migrations: string[]
}

export interface ModuleLayerResponse {
  modules: ModuleLayer[]
}

// Types for Database Schemas
export interface DatabaseSchema {
  id: string
  name: string
  tables: string[]
  filePath: string
}

export interface SchemasResponse {
  schemas: DatabaseSchema[]
}

function isCoreLayerResponse(value: unknown): value is CoreLayerResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.layers) &&
    value.layers.every(
      (layer) =>
        isRecord(layer) &&
        typeof layer.id === 'string' &&
        typeof layer.name === 'string' &&
        typeof layer.description === 'string' &&
        isStringArray(layer.types) &&
        typeof layer.filePath === 'string',
    )
  )
}

function isModuleLayerResponse(value: unknown): value is ModuleLayerResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.modules) &&
    value.modules.every(
      (module) =>
        isRecord(module) &&
        typeof module.id === 'string' &&
        typeof module.version === 'string' &&
        isStringArray(module.dependsOn) &&
        isStringArray(module.entities) &&
        isStringArray(module.events) &&
        isStringArray(module.commands) &&
        isStringArray(module.queries) &&
        isStringArray(module.fsms) &&
        isStringArray(module.migrations),
    )
  )
}

function isSchemasResponse(value: unknown): value is SchemasResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.schemas) &&
    value.schemas.every(
      (schema) =>
        isRecord(schema) &&
        typeof schema.id === 'string' &&
        typeof schema.name === 'string' &&
        isStringArray(schema.tables) &&
        typeof schema.filePath === 'string',
    )
  )
}

// API Functions
export async function fetchCoreLayer(): Promise<CoreLayer[]> {
  const response = await fetch(`${API_BASE_URL}/core`)
  if (!response.ok) {
    throw new Error(`Failed to fetch core layer: ${response.statusText}`)
  }
  const data: unknown = await response.json()
  if (!isCoreLayerResponse(data)) throw new Error('Invalid core-layer response')
  return data.layers
}

export async function fetchModuleLayer(): Promise<ModuleLayer[]> {
  const response = await fetch(`${API_BASE_URL}/modules`)
  if (!response.ok) {
    throw new Error(`Failed to fetch modules: ${response.statusText}`)
  }
  const data: unknown = await response.json()
  if (!isModuleLayerResponse(data)) throw new Error('Invalid module-layer response')
  return data.modules
}

export async function fetchSchemas(): Promise<DatabaseSchema[]> {
  const response = await fetch(`${API_BASE_URL}/schemas`)
  if (!response.ok) {
    throw new Error(`Failed to fetch schemas: ${response.statusText}`)
  }
  const data: unknown = await response.json()
  if (!isSchemasResponse(data)) throw new Error('Invalid schema response')
  return data.schemas
}

// Health check
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    return response.ok
  } catch {
    return false
  }
}
