import type { RendererDefinition } from './renderer-definition'

export class RendererRegistry {
  readonly #definitions: ReadonlyMap<string, RendererDefinition>

  constructor(definitions: readonly RendererDefinition[]) {
    const entries = new Map<string, RendererDefinition>()
    for (const definition of definitions) {
      if (entries.has(definition.name)) {
        throw new Error(`renderer 重复注册：${definition.name}`)
      }
      entries.set(
        definition.name,
        Object.freeze({
          ...definition,
          allowedProfiles: Object.freeze([...definition.allowedProfiles]),
          schema: Object.freeze({
            safeParse: (value: unknown) => definition.schema.safeParse(value),
          }),
          security: Object.freeze({ ...definition.security }),
        }),
      )
    }
    this.#definitions = entries
  }

  get(name: string): RendererDefinition | undefined {
    return this.#definitions.get(name)
  }

  has(name: string): boolean {
    return this.#definitions.has(name)
  }

  list(): readonly RendererDefinition[] {
    return Object.freeze([...this.#definitions.values()])
  }
}
