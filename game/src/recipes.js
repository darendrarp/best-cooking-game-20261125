// The menu: five dishes built from the same handful of ingredients in different combinations,
// so one grill run and one chop session can feed several orders at once.

export const INGREDIENTS = {
  bun: { name: 'Bun', short: 'BUN' },
  patty_raw: { name: 'Raw patty', short: 'PATTY' },
  patty: { name: 'Grilled patty', short: 'PATTY' },
  patty_burnt: { name: 'Burnt patty', short: 'BURNT' },
  lettuce: { name: 'Lettuce', short: 'LETTUCE' },
  lettuce_chopped: { name: 'Chopped lettuce', short: 'LETTUCE' },
  tomato: { name: 'Tomato', short: 'TOMATO' },
  tomato_chopped: { name: 'Chopped tomato', short: 'TOMATO' },
  cheese: { name: 'Cheese', short: 'CHEESE' },
  potato: { name: 'Potato', short: 'POTATO' },
  fries: { name: 'Crispy fries', short: 'FRIES' },
  fries_burnt: { name: 'Burnt fries', short: 'BURNT' },
};

export const RECIPES = {
  classic: {
    id: 'classic',
    name: 'Classic Burger',
    needs: ['bun', 'patty', 'lettuce_chopped'],
    price: 8,
    weight: 25,
  },
  cheese: {
    id: 'cheese',
    name: 'Cheese Burger',
    needs: ['bun', 'patty', 'cheese'],
    price: 9,
    weight: 20,
  },
  deluxe: {
    id: 'deluxe',
    name: 'Deluxe Burger',
    needs: ['bun', 'patty', 'lettuce_chopped', 'tomato_chopped', 'cheese'],
    price: 14,
    weight: 15,
  },
  salad: {
    id: 'salad',
    name: 'Garden Salad',
    needs: ['lettuce_chopped', 'tomato_chopped', 'cheese'],
    price: 7,
    weight: 20,
  },
  fries: {
    id: 'fries',
    name: 'Crispy Fries',
    needs: ['fries'],
    price: 5,
    weight: 20,
  },
};

export const RECIPE_LIST = Object.values(RECIPES);

/** Pick a recipe with the menu's weights, using the world's seeded random. */
export function pickRecipe(random) {
  let total = 0;
  for (const recipe of RECIPE_LIST) total += recipe.weight;
  let roll = random() * total;
  for (const recipe of RECIPE_LIST) {
    roll -= recipe.weight;
    if (roll <= 0) return recipe;
  }
  return RECIPES.classic;
}

/** True when a plate's contents are exactly a recipe's needs, in any order. */
export function plateMatchesRecipe(contents, recipe) {
  if (contents.length !== recipe.needs.length) return false;
  const left = [...contents];
  for (const need of recipe.needs) {
    const at = left.indexOf(need);
    if (at === -1) return false;
    left.splice(at, 1);
  }
  return true;
}

/** The recipe a plate already is, or null when it matches none (yet). */
export function recipeOfPlate(contents) {
  for (const recipe of RECIPE_LIST) {
    if (plateMatchesRecipe(contents, recipe)) return recipe;
  }
  return null;
}

/** What a plate still needs to become `recipe`, or null when it can never become it. */
export function missingForRecipe(contents, recipe) {
  const left = [...contents];
  for (const need of recipe.needs) {
    const at = left.indexOf(need);
    if (at !== -1) left.splice(at, 1);
  }
  // Anything on the plate that the recipe does not want blocks it.
  const extra = left.filter((item) => !recipe.needs.includes(item));
  if (extra.length > 0) return null;
  const missing = [];
  const have = [...contents];
  for (const need of recipe.needs) {
    const at = have.indexOf(need);
    if (at === -1) missing.push(need);
    else have.splice(at, 1);
  }
  return missing;
}
