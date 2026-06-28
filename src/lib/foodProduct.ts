export type FoodProductBasis = "per_100g" | "per_serving";

export function normalizeEan(raw: string): string {
  return raw.replace(/\D/g, "").trim();
}

export function isValidEan(ean: string): boolean {
  const digits = normalizeEan(ean);
  return digits.length >= 8 && digits.length <= 14;
}

export function calcProteinG(params: {
  amountG: number;
  proteinPer100g: number;
  basis: FoodProductBasis;
  servingG?: number | null;
}): number {
  const { amountG, proteinPer100g, basis, servingG } = params;
  if (amountG <= 0 || proteinPer100g <= 0) return 0;

  if (basis === "per_serving" && servingG && servingG > 0) {
    const servings = amountG / servingG;
    return Math.round(servings * proteinPer100g);
  }

  return Math.round((amountG * proteinPer100g) / 100);
}

export function defaultAmountG(product: {
  basis: FoodProductBasis;
  servingG?: number | null;
}): number {
  if (product.basis === "per_serving" && product.servingG && product.servingG > 0) {
    return Math.round(product.servingG);
  }
  return 100;
}
