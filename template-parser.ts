import Handlebars from "handlebars"

export interface VariableInfo {
  name: string
  type: "string" | "boolean" | "array"
}

const frontmatterRegex = /^---[ \t]*(?:\r\n|\r|\n)(?:[\s\S]*?(?:\r\n|\r|\n))?---[ \t]*(?:\r\n|\r|\n|$)/

export function stripFrontmatter(source: string): string {
  if (!source.startsWith("---")) return source
  return source.replace(frontmatterRegex, "")
}

export function extractVariables(template: string): VariableInfo[] {
  const body = stripFrontmatter(template)
  const variables = new Map<string, VariableInfo>()

  // Match #if blocks: {{#if varname}}
  const ifRegex = /\{\{#if\s+([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
  let match
  while ((match = ifRegex.exec(body)) !== null) {
    const name = match[1]
    variables.set(name, { name, type: "boolean" })
  }

  // Match #unless blocks: {{#unless varname}}
  const unlessRegex = /\{\{#unless\s+([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
  while ((match = unlessRegex.exec(body)) !== null) {
    const name = match[1]
    variables.set(name, { name, type: "boolean" })
  }

  // Match #each blocks: {{#each varname}}
  const eachRegex = /\{\{#each\s+([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
  while ((match = eachRegex.exec(body)) !== null) {
    const name = match[1]
    variables.set(name, { name, type: "array" })
  }

  // Match simple variables: {{name}} or {{user.email}}
  // This regex avoids matching helpers like {{#if}}, {{/if}}, {{else}}
  const simpleVarRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g
  while ((match = simpleVarRegex.exec(body)) !== null) {
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
  const body = stripFrontmatter(template)
  const compiled = Handlebars.compile(body)
  return compiled(variables)
}
