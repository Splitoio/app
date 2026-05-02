/**
 * Single source of truth for expense categories on the frontend.
 * Mirror this file in `backend/src/constants/expense-categories.ts`.
 */

export const EXPENSE_CATEGORIES = [
  { label: "Business", emoji: "💼" },
  { label: "Software", emoji: "💻" },
  { label: "Hardware", emoji: "🖥️" },
  { label: "Travel", emoji: "✈️" },
  { label: "Marketing", emoji: "📣" },
  { label: "Office", emoji: "🏢" },
  { label: "Salary", emoji: "💰" },
  { label: "Other", emoji: "🧾" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["label"];

export const EXPENSE_CATEGORY_LABELS: ExpenseCategory[] =
  EXPENSE_CATEGORIES.map((c) => c.label);

const EMOJI_BY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.label.toUpperCase(), c.emoji])
);

export function getCategoryEmoji(category: string | undefined | null): string {
  if (!category) return "🧾";
  return EMOJI_BY_LABEL[category.toUpperCase()] ?? "🧾";
}
