/** Área en formato colombiano: 68.66 → "68,66", 60.9 → "60,90", 60 → "60". */
export function formatArea(m2: number): string {
  const decimals = Number.isInteger(m2) ? 0 : 2;
  return m2.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
