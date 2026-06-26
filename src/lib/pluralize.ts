/**
 * Pluralization rules for common entities in the app
 */
const PLURALIZATION_RULES: Record<
  string,
  { singular: string; plural: string }
> = {
  business: { singular: "Business", plural: "Businesses" },
  client: { singular: "Client", plural: "Clients" },
  invoice: { singular: "Invoice", plural: "Invoices" },
  setting: { singular: "Setting", plural: "Settings" },
  user: { singular: "User", plural: "Users" },
  payment: { singular: "Payment", plural: "Payments" },
  item: { singular: "Item", plural: "Items" },
  tax: { singular: "Tax", plural: "Taxes" },
  category: { singular: "Category", plural: "Categories" },
  company: { singular: "Company", plural: "Companies" },
  entity: { singular: "Entity", plural: "Entities" },
  expense: { singular: "Expense", plural: "Expenses" },
  report: { singular: "Report", plural: "Reports" },
};

/**
 * Get the plural form of a word
 */
export function pluralize(word: string, count?: number): string {
  // If count is provided and is 1, return singular
  if (count === 1) {
    return word;
  }

  const lowerWord = word.toLowerCase();

  // Check if we have a specific rule for this word
  if (PLURALIZATION_RULES[lowerWord]) {
    return PLURALIZATION_RULES[lowerWord].plural;
  }

  // Apply general pluralization rules
  // Words ending in s, ss, sh, ch, x, z
  if (/(?:s|ss|sh|ch|x|z)$/i.test(word)) {
    return word + "es";
  }

  // Words ending in consonant + y
  if (/[^aeiou]y$/i.test(word)) {
    return word.slice(0, -1) + "ies";
  }

  // Words ending in f or fe
  if (/(?:f|fe)$/i.test(word)) {
    return word.replace(/(?:f|fe)$/i, "ves");
  }

  // Default: just add 's'
  return word + "s";
}

/**
 * Get the singular form of a word
 */
export function singularize(word: string): string {
  const lowerWord = word.toLowerCase();

  // Check if we have a specific rule for this word (search by plural)
  const rule = Object.values(PLURALIZATION_RULES).find(
    (r) => r.plural.toLowerCase() === lowerWord,
  );

  if (rule) {
    return rule.singular;
  }

  // Apply general singularization rules
  // Words ending in ies
  if (/ies$/i.test(word)) {
    return word.slice(0, -3) + "y";
  }

  // Words ending in es
  if (/(?:s|ss|sh|ch|x|z)es$/i.test(word)) {
    return word.slice(0, -2);
  }

  // Words ending in ves
  if (/ves$/i.test(word)) {
    return word.slice(0, -3) + "f";
  }

  // Words ending in s
  if (/s$/i.test(word) && word.length > 1) {
    return word.slice(0, -1);
  }

  // Default: return as is
  return word;
}

/**
 * Capitalize the first letter of a word
 */
export function capitalize(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Get a properly formatted label for a route segment
 */
export function getRouteLabel(segment: string, isPlural = true): string {
  const lower = segment.toLowerCase();

  // Route segments are often already plural (e.g. "entities", "invoices")
  const ruleByPlural = Object.values(PLURALIZATION_RULES).find(
    (r) => r.plural.toLowerCase() === lower,
  );
  if (ruleByPlural) {
    return isPlural ? ruleByPlural.plural : ruleByPlural.singular;
  }

  const rule = PLURALIZATION_RULES[lower];
  if (rule) {
    return isPlural ? rule.plural : rule.singular;
  }

  const singularForm = singularize(segment);
  const singularRule = PLURALIZATION_RULES[singularForm.toLowerCase()];
  if (singularRule) {
    return isPlural ? singularRule.plural : singularRule.singular;
  }

  const capitalized = capitalize(segment);
  if (isPlural && /s$/i.test(segment)) {
    return capitalized;
  }

  return isPlural ? pluralize(capitalized) : capitalize(singularForm);
}
