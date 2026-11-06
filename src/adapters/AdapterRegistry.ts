/** Generic lookup by format name, used for importers and exporters (Open/Closed). */
export class AdapterRegistry<T extends { readonly format: string }> {
  private readonly items = new Map<string, T>();

  constructor(items: T[] = []) {
    items.forEach((i) => this.register(i));
  }

  register(item: T): this {
    this.items.set(item.format, item);
    return this;
  }

  get(format: string): T {
    const item = this.items.get(format);
    if (!item) throw new Error(`Unsupported format "${format}". Supported: ${this.formats().join(', ')}`);
    return item;
  }

  formats(): string[] {
    return [...this.items.keys()];
  }
}
