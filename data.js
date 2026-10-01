// NutriPlan — Food & Recipe Database
"use strict";

const ALLERGENS = ["Peanuts", "Tree nuts", "Dairy", "Eggs", "Gluten", "Soy", "Fish", "Shellfish", "Sesame"];

const DIET_TAGS = ["Vegetarian", "Vegan", "Eggetarian", "Pescatarian", "Jain", "Gluten-free", "Lactose-free"];

const FOOD_DB = [
  // Breakfast
  { name: "Oats with banana & honey", meal: "breakfast", kcal: 320, protein: 11, carbs: 58, fat: 6, fiber: 7, allergens: ["Gluten"], diet: ["Vegetarian"], cuisine: "Global" },
  { name: "Poha with peanuts", meal: "breakfast", kcal: 290, protein: 8, carbs: 48, fat: 7, fiber: 4, allergens: ["Peanuts"], diet: ["Vegetarian", "Vegan", "Jain"], cuisine: "Indian" },
  { name: "Vegetable upma", meal: "breakfast", kcal: 280, protein: 7, carbs: 50, fat: 6, fiber: 5, allergens: [], diet: ["Vegetarian", "Vegan", "Jain"], cuisine: "Indian" },
  { name: "Greek yogurt bowl with berries", meal: "breakfast", kcal: 260, protein: 18, carbs: 28, fat: 8, fiber: 4, allergens: ["Dairy", "Tree nuts"], diet: ["Vegetarian", "Gluten-free"], cuisine: "Global" },
  { name: "Masala omelette", meal: "breakfast", kcal: 240, protein: 16, carbs: 3, fat: 18, fiber: 1, allergens: ["Eggs"], diet: ["Eggetarian", "Vegetarian"], cuisine: "Indian" },
  { name: "Idli with sambar", meal: "breakfast", kcal: 300, protein: 10, carbs: 56, fat: 4, fiber: 5, allergens: [], diet: ["Vegetarian", "Jain"], cuisine: "Indian" },
  { name: "Peanut butter toast", meal: "breakfast", kcal: 330, protein: 12, carbs: 36, fat: 15, fiber: 5, allergens: ["Peanuts", "Gluten"], diet: ["Vegetarian"], cuisine: "Global" },
  { name: "Fruit & seed smoothie", meal: "breakfast", kcal: 250, protein: 9, carbs: 40, fat: 6, fiber: 6, allergens: [], diet: ["Vegan", "Vegetarian", "Gluten-free"], cuisine: "Global" },
  { name: "Besan chilla", meal: "breakfast", kcal: 270, protein: 12, carbs: 34, fat: 8, fiber: 6, allergens: [], diet: ["Vegetarian", "Vegan", "Jain", "Gluten-free"], cuisine: "Indian" },

  // Lunch
  { name: "Rajma chawal", meal: "lunch", kcal: 480, protein: 18, carbs: 82, fat: 8, fiber: 12, allergens: [], diet: ["Vegetarian", "Vegan", "Jain", "Gluten-free"], cuisine: "Indian" },
  { name: "Chole with rice", meal: "lunch", kcal: 500, protein: 17, carbs: 85, fat: 9, fiber: 13, allergens: [], diet: ["Vegetarian", "Vegan", "Jain"], cuisine: "Indian" },
  { name: "Grilled chicken & quinoa bowl", meal: "lunch", kcal: 520, protein: 42, carbs: 45, fat: 16, fiber: 8, allergens: [], diet: ["Gluten-free"], cuisine: "Global" },
  { name: "Paneer tikka with roti", meal: "lunch", kcal: 510, protein: 26, carbs: 52, fat: 22, fiber: 7, allergens: ["Dairy"], diet: ["Vegetarian"], cuisine: "Indian" },
  { name: "Dal tadka, rice & sabzi", meal: "lunch", kcal: 460, protein: 16, carbs: 74, fat: 10, fiber: 10, allergens: [], diet: ["Vegetarian", "Vegan", "Jain", "Gluten-free"], cuisine: "Indian" },
  { name: "Veg fried rice", meal: "lunch", kcal: 470, protein: 11, carbs: 78, fat: 12, fiber: 5, allergens: ["Soy"], diet: ["Vegetarian", "Vegan"], cuisine: "Chinese" },
  { name: "Pasta primavera", meal: "lunch", kcal: 490, protein: 15, carbs: 72, fat: 14, fiber: 8, allergens: ["Gluten", "Dairy"], diet: ["Vegetarian"], cuisine: "Italian" },
  { name: "Baked salmon & veggies", meal: "lunch", kcal: 500, protein: 38, carbs: 28, fat: 24, fiber: 6, allergens: ["Fish"], diet: ["Pescatarian", "Gluten-free"], cuisine: "Global" },
  { name: "Falafel wrap", meal: "lunch", kcal: 450, protein: 15, carbs: 62, fat: 14, fiber: 10, allergens: ["Gluten", "Sesame"], diet: ["Vegetarian", "Vegan"], cuisine: "Middle Eastern" },
  { name: "Sambar rice", meal: "lunch", kcal: 440, protein: 13, carbs: 78, fat: 7, fiber: 9, allergens: [], diet: ["Vegetarian", "Jain"], cuisine: "Indian" },

  // Snack
  { name: "Roasted chana", meal: "snack", kcal: 160, protein: 9, carbs: 26, fat: 2, fiber: 8, allergens: [], diet: ["Vegan", "Vegetarian", "Jain", "Gluten-free"], cuisine: "Indian" },
  { name: "Fruit salad", meal: "snack", kcal: 140, protein: 2, carbs: 34, fat: 1, fiber: 5, allergens: [], diet: ["Vegan", "Vegetarian", "Jain", "Gluten-free"], cuisine: "Global" },
  { name: "Sprouts chaat", meal: "snack", kcal: 180, protein: 10, carbs: 30, fat: 2, fiber: 7, allergens: [], diet: ["Vegan", "Vegetarian", "Jain", "Gluten-free"], cuisine: "Indian" },
  { name: "Trail mix", meal: "snack", kcal: 200, protein: 6, carbs: 18, fat: 12, fiber: 4, allergens: ["Peanuts", "Tree nuts"], diet: ["Vegan", "Vegetarian", "Gluten-free"], cuisine: "Global" },
  { name: "Buttermilk & roasted makhana", meal: "snack", kcal: 150, protein: 6, carbs: 20, fat: 4, fiber: 2, allergens: ["Dairy"], diet: ["Vegetarian", "Jain"], cuisine: "Indian" },
  { name: "Hummus & carrot sticks", meal: "snack", kcal: 170, protein: 6, carbs: 18, fat: 8, fiber: 6, allergens: ["Sesame"], diet: ["Vegan", "Vegetarian", "Gluten-free"], cuisine: "Middle Eastern" },

  // Dinner
  { name: "Khichdi with curd", meal: "dinner", kcal: 420, protein: 15, carbs: 68, fat: 8, fiber: 8, allergens: ["Dairy"], diet: ["Vegetarian", "Jain", "Gluten-free"], cuisine: "Indian" },
  { name: "Mix veg curry with roti", meal: "dinner", kcal: 430, protein: 12, carbs: 64, fat: 13, fiber: 9, allergens: [], diet: ["Vegetarian", "Vegan", "Jain"], cuisine: "Indian" },
  { name: "Tofu stir fry & brown rice", meal: "dinner", kcal: 450, protein: 22, carbs: 58, fat: 14, fiber: 8, allergens: ["Soy"], diet: ["Vegan", "Vegetarian", "Gluten-free"], cuisine: "Chinese" },
  { name: "Egg curry & rice", meal: "dinner", kcal: 470, protein: 20, carbs: 62, fat: 15, fiber: 4, allergens: ["Eggs"], diet: ["Eggetarian"], cuisine: "Indian" },
  { name: "Grilled fish & salad", meal: "dinner", kcal: 400, protein: 36, carbs: 14, fat: 22, fiber: 5, allergens: ["Fish"], diet: ["Pescatarian", "Gluten-free"], cuisine: "Global" },
  { name: "Palak paneer with roti", meal: "dinner", kcal: 460, protein: 20, carbs: 48, fat: 20, fiber: 8, allergens: ["Dairy"], diet: ["Vegetarian"], cuisine: "Indian" },
  { name: "Veg soup & garlic bread", meal: "dinner", kcal: 380, protein: 10, carbs: 52, fat: 12, fiber: 6, allergens: ["Gluten"], diet: ["Vegetarian"], cuisine: "Italian" },
  { name: "Moong dal chilla with chutney", meal: "dinner", kcal: 350, protein: 16, carbs: 42, fat: 9, fiber: 7, allergens: [], diet: ["Vegetarian", "Vegan", "Jain", "Gluten-free"], cuisine: "Indian" }
];

const RECIPES = [
  {
    id: "rajma-chawal",
    name: "Rajma Chawal",
    cuisine: "Indian",
    diet: ["Vegetarian", "Vegan", "Jain", "Gluten-free"],
    allergens: [],
    prepTime: 45,
    servings: 2,
    mealType: "lunch",
    kcalPerServing: 480,
    ingredients: [
      { name: "Rajma (kidney beans)", qty: "1 cup" },
      { name: "Rice", qty: "1 cup" },
      { name: "Onion", qty: "1" },
      { name: "Tomato", qty: "2" },
      { name: "Ginger-garlic paste", qty: "1 tbsp" },
      { name: "Rajma masala / garam masala", qty: "1 tbsp" }
    ],
    steps: [
      "Soak rajma overnight, then pressure-cook until soft.",
      "Sauté onion, tomato and ginger-garlic paste; add spices.",
      "Add cooked rajma and simmer 15 minutes until gravy thickens.",
      "Serve hot over steamed rice."
    ]
  },
  {
    id: "veggie-upma",
    name: "Vegetable Upma",
    cuisine: "Indian",
    diet: ["Vegetarian", "Vegan", "Jain"],
    allergens: [],
    prepTime: 20,
    servings: 2,
    mealType: "breakfast",
    kcalPerServing: 280,
    ingredients: [
      { name: "Rava / semolina", qty: "1 cup" },
      { name: "Mixed vegetables", qty: "1 cup" },
      { name: "Mustard seeds", qty: "1 tsp" },
      { name: "Curry leaves", qty: "a few" },
      { name: "Onion", qty: "1" }
    ],
    steps: [
      "Dry-roast rava until lightly golden; set aside.",
      "Temper mustard seeds and curry leaves; sauté onion and vegetables.",
      "Add water (2:1), bring to a boil, then slowly add rava while stirring.",
      "Cook until fluffy; serve warm."
    ]
  },
  {
    id: "masala-omelette",
    name: "Masala Omelette",
    cuisine: "Indian",
    diet: ["Eggetarian", "Vegetarian"],
    allergens: ["Eggs"],
    prepTime: 10,
    servings: 1,
    mealType: "breakfast",
    kcalPerServing: 240,
    ingredients: [
      { name: "Eggs", qty: "2" },
      { name: "Onion", qty: "1 small" },
      { name: "Tomato", qty: "1 small" },
      { name: "Green chili", qty: "1" },
      { name: "Turmeric & salt", qty: "to taste" }
    ],
    steps: [
      "Whisk eggs with chopped vegetables and spices.",
      "Pour into a heated, lightly oiled pan.",
      "Cook until set, flip once, and serve hot."
    ]
  },
  {
    id: "palak-paneer",
    name: "Palak Paneer",
    cuisine: "Indian",
    diet: ["Vegetarian", "Gluten-free"],
    allergens: ["Dairy"],
    prepTime: 30,
    servings: 2,
    mealType: "dinner",
    kcalPerServing: 460,
    ingredients: [
      { name: "Spinach", qty: "250 g" },
      { name: "Paneer", qty: "150 g" },
      { name: "Onion", qty: "1" },
      { name: "Tomato", qty: "1" },
      { name: "Cream (optional)", qty: "2 tbsp" },
      { name: "Garam masala", qty: "1 tsp" }
    ],
    steps: [
      "Blanch spinach and blend to a smooth purée.",
      "Sauté onion and tomato; add spices.",
      "Add spinach purée and simmer 5 minutes.",
      "Fold in paneer cubes; finish with cream if using."
    ]
  },
  {
    id: "pasta-primavera",
    name: "Pasta Primavera",
    cuisine: "Italian",
    diet: ["Vegetarian"],
    allergens: ["Gluten", "Dairy"],
    prepTime: 25,
    servings: 2,
    mealType: "lunch",
    kcalPerServing: 490,
    ingredients: [
      { name: "Pasta", qty: "200 g" },
      { name: "Bell peppers", qty: "1 cup" },
      { name: "Zucchini", qty: "1" },
      { name: "Cherry tomatoes", qty: "1 cup" },
      { name: "Parmesan", qty: "30 g" },
      { name: "Olive oil & garlic", qty: "2 tbsp" }
    ],
    steps: [
      "Boil pasta until al dente; reserve some pasta water.",
      "Sauté garlic and vegetables until tender-crisp.",
      "Toss pasta with vegetables, pasta water and cheese.",
      "Season and serve."
    ]
  },
  {
    id: "tofu-stirfry",
    name: "Tofu Stir Fry with Brown Rice",
    cuisine: "Chinese",
    diet: ["Vegan", "Vegetarian", "Gluten-free"],
    allergens: ["Soy"],
    prepTime: 25,
    servings: 2,
    mealType: "dinner",
    kcalPerServing: 450,
    ingredients: [
      { name: "Firm tofu", qty: "200 g" },
      { name: "Broccoli & carrots", qty: "2 cups" },
      { name: "Soy sauce (tamari for GF)", qty: "2 tbsp" },
      { name: "Ginger & garlic", qty: "1 tbsp" },
      { name: "Brown rice", qty: "1 cup" }
    ],
    steps: [
      "Cook brown rice; press and cube tofu.",
      "Pan-sear tofu until golden; set aside.",
      "Stir-fry vegetables with ginger, garlic and soy sauce.",
      "Return tofu to pan, toss, and serve over rice."
    ]
  },
  {
    id: "sprouts-chaat",
    name: "Sprouts Chaat",
    cuisine: "Indian",
    diet: ["Vegan", "Vegetarian", "Jain", "Gluten-free"],
    allergens: [],
    prepTime: 10,
    servings: 1,
    mealType: "snack",
    kcalPerServing: 180,
    ingredients: [
      { name: "Moong sprouts", qty: "1 cup" },
      { name: "Onion & tomato", qty: "½ cup" },
      { name: "Lemon juice", qty: "1 tsp" },
      { name: "Chaat masala", qty: "½ tsp" },
      { name: "Coriander", qty: "to garnish" }
    ],
    steps: [
      "Lightly steam or use raw sprouts.",
      "Mix with chopped onion, tomato and spices.",
      "Finish with lemon juice and coriander."
    ]
  },
  {
    id: "berry-yogurt-bowl",
    name: "Greek Yogurt Berry Bowl",
    cuisine: "Global",
    diet: ["Vegetarian", "Gluten-free"],
    allergens: ["Dairy", "Tree nuts"],
    prepTime: 5,
    servings: 1,
    mealType: "breakfast",
    kcalPerServing: 260,
    ingredients: [
      { name: "Greek yogurt", qty: "200 g" },
      { name: "Mixed berries", qty: "1 cup" },
      { name: "Honey", qty: "1 tsp" },
      { name: "Almonds", qty: "10 g" }
    ],
    steps: [
      "Spoon yogurt into a bowl.",
      "Top with berries, honey and almonds."
    ]
  },
  {
    id: "baked-salmon",
    name: "Baked Salmon & Veggies",
    cuisine: "Global",
    diet: ["Pescatarian", "Gluten-free"],
    allergens: ["Fish"],
    prepTime: 30,
    servings: 2,
    mealType: "lunch",
    kcalPerServing: 500,
    ingredients: [
      { name: "Salmon fillets", qty: "2" },
      { name: "Broccoli", qty: "2 cups" },
      { name: "Baby potatoes", qty: "2 cups" },
      { name: "Lemon & herbs", qty: "to taste" },
      { name: "Olive oil", qty: "1 tbsp" }
    ],
    steps: [
      "Preheat oven to 200°C.",
      "Toss vegetables in oil; arrange with salmon on a tray.",
      "Bake 18–20 minutes until salmon flakes easily.",
      "Finish with lemon and herbs."
    ]
  },
  {
    id: "falafel-wrap",
    name: "Falafel Wrap",
    cuisine: "Middle Eastern",
    diet: ["Vegetarian", "Vegan"],
    allergens: ["Gluten", "Sesame"],
    prepTime: 35,
    servings: 2,
    mealType: "lunch",
    kcalPerServing: 450,
    ingredients: [
      { name: "Chickpeas (cooked)", qty: "1.5 cups" },
      { name: "Parsley & cilantro", qty: "1 cup" },
      { name: "Garlic & cumin", qty: "1 tbsp" },
      { name: "Tahini", qty: "2 tbsp" },
      { name: "Flatbread", qty: "2" }
    ],
    steps: [
      "Blend chickpeas, herbs and spices; form patties.",
      "Pan-fry or bake until crisp.",
      "Spread tahini on flatbread, add falafel and salad; roll up."
    ]
  },
  {
    id: "khichdi",
    name: "Moong Dal Khichdi",
    cuisine: "Indian",
    diet: ["Vegetarian", "Jain", "Gluten-free"],
    allergens: ["Dairy"],
    prepTime: 30,
    servings: 2,
    mealType: "dinner",
    kcalPerServing: 420,
    ingredients: [
      { name: "Moong dal", qty: "½ cup" },
      { name: "Rice", qty: "½ cup" },
      { name: "Ghee", qty: "1 tsp" },
      { name: "Cumin & turmeric", qty: "1 tsp" },
      { name: "Vegetables (optional)", qty: "½ cup" }
    ],
    steps: [
      "Wash rice and dal together.",
      "Temper cumin in ghee; add rice-dal, turmeric and water (3:1).",
      "Pressure-cook until soft and mushy.",
      "Serve warm with curd or pickle."
    ]
  },
  {
    id: "veg-soup-bread",
    name: "Veg Soup & Garlic Bread",
    cuisine: "Italian",
    diet: ["Vegetarian"],
    allergens: ["Gluten"],
    prepTime: 20,
    servings: 2,
    mealType: "dinner",
    kcalPerServing: 380,
    ingredients: [
      { name: "Mixed vegetables", qty: "3 cups" },
      { name: "Vegetable stock", qty: "3 cups" },
      { name: "Garlic", qty: "4 cloves" },
      { name: "Bread", qty: "4 slices" },
      { name: "Butter", qty: "1 tbsp" }
    ],
    steps: [
      "Simmer vegetables in stock until tender; blend partially for texture.",
      "Mix butter with garlic; spread on bread and toast.",
      "Serve soup hot with garlic bread."
    ]
  }
];

// Simple ingredient-based grocery categories
const GROCERY_CATEGORIES = [
  "Vegetables & Fruits",
  "Grains & Pulses",
  "Dairy & Eggs",
  "Protein",
  "Pantry & Spices",
  "Other"
];

function categorizeIngredient(name) {
  const n = name.toLowerCase();
  const veg = ["spinach","tomato","onion","carrot","broccoli","zucchini","pepper","potato","cauliflower","beans","peas","coriander","parsley","curry","chili","lemon","berry","banana","apple","fruit","salad","vegetable","mushroom","garlic","ginger","cucumber","lettuce"];
  const grains = ["rice","roti","flour","atta","oats","pasta","bread","rava","quinoa","dal","rajma","chole","chickpea","bean","moong","semolina","khichdi"];
  const dairy = ["milk","yogurt","curd","paneer","cheese","butter","ghee","cream"];
  const protein = ["egg","chicken","fish","salmon","tofu","paneer tikka"];
  const pantry = ["oil","salt","sugar","masala","spice","turmeric","cumin","mustard","honey","sauce","vinegar","seed","nut","peanut","tahini"];
  if (veg.some(k => n.includes(k))) return "Vegetables & Fruits";
  if (dairy.some(k => n.includes(k))) return "Dairy & Eggs";
  if (protein.some(k => n.includes(k)) && !dairy.some(k => n.includes(k))) return "Protein";
  if (grains.some(k => n.includes(k))) return "Grains & Pulses";
  if (pantry.some(k => n.includes(k))) return "Pantry & Spices";
  return "Other";
}

