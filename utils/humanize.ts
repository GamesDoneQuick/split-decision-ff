export function pluralize(count: number, singular: string, plural?: string) {
  if (count === 1) return singular;

  return plural || `${singular}s`;
}

export function pluralizeWithValue(count: number, singular: string, plural?: string) {
  return `${count} ${pluralize(count, singular, plural)}`;
}
