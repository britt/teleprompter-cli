import Handlebars from "handlebars"

export interface VariableInfo {
  name: string
  type: "string" | "boolean" | "array"
}

export function extractVariables(template: string): VariableInfo[] {
  const variables = new Map<string, VariableInfo>()

  // Match #if blocks: {{#if varname}}
  const ifRegex = /\{\{#if\s+([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
  let match
  while ((match = ifRegex.exec(template)) !== null) {
    const name = match[1]
    variables.set(name, { name, type: "boolean" })
  }

  // Match #unless blocks: {{#unless varname}}
  const unlessRegex = /\{\{#unless\s+([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
  while ((match = unlessRegex.exec(template)) !== null) {
    const name = match[1]
    variables.set(name, { name, type: "boolean" })
  }

  // Match #each blocks: {{#each varname}}
  const eachRegex = /\{\{#each\s+([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
  while ((match = eachRegex.exec(template)) !== null) {
    const name = match[1]
    variables.set(name, { name, type: "array" })
  }

  // Match simple variables: {{name}} or {{user.email}}
  // This regex avoids matching helpers like {{#if}}, {{/if}}, {{else}}
  const simpleVarRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
  while ((match = simpleVarRegex.exec(template)) !== null) {
    const name = match[1]
    // Skip built-ins and already-typed variables
    if (!["this", "else"].includes(name) && !variables.has(name)) {
      variables.set(name, { name, type: "string" })
    }
  }

  return Array.from(variables.values())
}

export function compileTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  const compiled = Handlebars.compile(template)
  return compiled(variables)
}
