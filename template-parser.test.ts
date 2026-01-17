import { test, expect, describe } from "bun:test"
import { extractVariables, compileTemplate, VariableInfo } from "./template-parser"

describe("template-parser", () => {
  describe("extractVariables", () => {
    test("extracts simple variables", () => {
      const vars = extractVariables("Hello {{name}}, welcome to {{place}}")
      expect(vars).toContainEqual({ name: "name", type: "string" })
      expect(vars).toContainEqual({ name: "place", type: "string" })
    })

    test("extracts dotted paths", () => {
      const vars = extractVariables("Email: {{user.email}}")
      expect(vars).toContainEqual({ name: "user.email", type: "string" })
    })

    test("extracts boolean from #if", () => {
      const vars = extractVariables("{{#if premium}}VIP{{/if}}")
      expect(vars).toContainEqual({ name: "premium", type: "boolean" })
    })

    test("extracts boolean from #unless", () => {
      const vars = extractVariables("{{#unless disabled}}Active{{/unless}}")
      expect(vars).toContainEqual({ name: "disabled", type: "boolean" })
    })

    test("extracts array from #each", () => {
      const vars = extractVariables("{{#each items}}{{this}}{{/each}}")
      expect(vars).toContainEqual({ name: "items", type: "array" })
    })

    test("deduplicates repeated variables", () => {
      const vars = extractVariables("{{name}} and {{name}} again")
      const nameVars = vars.filter(v => v.name === "name")
      expect(nameVars).toHaveLength(1)
    })

    test("returns empty array for no variables", () => {
      const vars = extractVariables("No variables here")
      expect(vars).toEqual([])
    })

    test("handles nested helpers", () => {
      const vars = extractVariables(`
        {{#if showList}}
          {{#each items}}
            {{this}}
          {{/each}}
        {{/if}}
      `)
      expect(vars).toContainEqual({ name: "showList", type: "boolean" })
      expect(vars).toContainEqual({ name: "items", type: "array" })
    })

    test("does not extract 'this' or 'else' as variables", () => {
      const vars = extractVariables("{{#each items}}{{this}}{{else}}None{{/each}}")
      const thisVars = vars.filter(v => v.name === "this")
      const elseVars = vars.filter(v => v.name === "else")
      expect(thisVars).toHaveLength(0)
      expect(elseVars).toHaveLength(0)
    })
  })

  describe("compileTemplate", () => {
    test("compiles with simple variables", () => {
      const result = compileTemplate("Hello {{name}}", { name: "World" })
      expect(result).toBe("Hello World")
    })

    test("renders #if block when true", () => {
      const result = compileTemplate("{{#if show}}Visible{{/if}}", { show: true })
      expect(result).toBe("Visible")
    })

    test("skips #if block when false", () => {
      const result = compileTemplate("{{#if show}}Visible{{/if}}", { show: false })
      expect(result).toBe("")
    })

    test("iterates #each over array", () => {
      const result = compileTemplate("{{#each items}}[{{this}}]{{/each}}", {
        items: ["a", "b", "c"]
      })
      expect(result).toBe("[a][b][c]")
    })

    test("handles dotted paths", () => {
      const result = compileTemplate("{{user.name}}", {
        user: { name: "Alice" }
      })
      expect(result).toBe("Alice")
    })

    test("handles missing variables gracefully", () => {
      const result = compileTemplate("Hello {{name}}", {})
      expect(result).toBe("Hello ")
    })

    test("handles #unless block", () => {
      const result = compileTemplate("{{#unless disabled}}Active{{/unless}}", { disabled: false })
      expect(result).toBe("Active")
    })
  })
})
