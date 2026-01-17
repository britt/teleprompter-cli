import { test, expect, describe } from "bun:test"
import React from "react"
import { render } from "ink-testing-library"
import { VariableForm } from "./VariableForm"
import { VariableInfo } from "../template-parser"

describe("VariableForm", () => {
  test("renders text input for string variables", () => {
    const variables: VariableInfo[] = [{ name: "name", type: "string" }]
    const { lastFrame } = render(
      <VariableForm
        variables={variables}
        values={{}}
        onChange={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("name")
  })

  test("renders checkbox for boolean variables", () => {
    const variables: VariableInfo[] = [{ name: "premium", type: "boolean" }]
    const { lastFrame } = render(
      <VariableForm
        variables={variables}
        values={{}}
        onChange={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("premium")
    expect(lastFrame()).toMatch(/\[.\]/) // checkbox indicator
  })

  test("renders textarea hint for array variables", () => {
    const variables: VariableInfo[] = [{ name: "items", type: "array" }]
    const { lastFrame } = render(
      <VariableForm
        variables={variables}
        values={{}}
        onChange={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("items")
    expect(lastFrame()).toContain("comma-separated")
  })

  test("shows message when no variables", () => {
    const { lastFrame } = render(
      <VariableForm
        variables={[]}
        values={{}}
        onChange={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("No variables")
  })

  test("displays multiple variables", () => {
    const variables: VariableInfo[] = [
      { name: "name", type: "string" },
      { name: "active", type: "boolean" },
      { name: "tags", type: "array" }
    ]
    const { lastFrame } = render(
      <VariableForm
        variables={variables}
        values={{}}
        onChange={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("name")
    expect(lastFrame()).toContain("active")
    expect(lastFrame()).toContain("tags")
  })

  test("shows current values", () => {
    const variables: VariableInfo[] = [
      { name: "greeting", type: "string" }
    ]
    const { lastFrame } = render(
      <VariableForm
        variables={variables}
        values={{ greeting: "Hello" }}
        onChange={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("Hello")
  })

  test("shows checked checkbox when boolean is true", () => {
    const variables: VariableInfo[] = [{ name: "enabled", type: "boolean" }]
    const { lastFrame } = render(
      <VariableForm
        variables={variables}
        values={{ enabled: true }}
        onChange={() => {}}
        focused={true}
      />
    )

    expect(lastFrame()).toContain("[x]")
  })
})
