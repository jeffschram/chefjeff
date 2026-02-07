/**
 * Canonical category list — single-select, broad meal/course type.
 * Shared between backend (AI validation) and frontend (dropdown).
 */
export const CATEGORIES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Appetizer",
  "Side Dish",
  "Dessert",
  "Snack",
  "Beverage",
  "Bread",
  "Sauce & Condiment",
  "Soup & Stew",
  "Salad",
] as const;

export type Category = (typeof CATEGORIES)[number];
