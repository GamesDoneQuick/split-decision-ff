export function mapById<T extends { id: string }>(categories: T[]): Record<string, T> {
  return categories.reduce((acc, item) => ({ ...acc, [item.id]: item }), {});
}
