/** Supabase puede devolver relaciones como objeto o como array de un elemento. */
export function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
