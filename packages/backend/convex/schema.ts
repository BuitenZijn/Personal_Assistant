/**
 * Convex Schema Definition
 *
 * Tables are grouped per feature. Each feature adds its tables in its own
 * section below the foundation.
 */

import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'

// ============================================================================
// Exported validators (for use in function args)
// ============================================================================

export const mobilePlatformValidator = v.union(
  v.literal('ios'),
  v.literal('android'),
)

export const roleValidator = v.union(v.literal('user'), v.literal('admin'))

export const dietValidator = v.union(
  v.literal('everything'),
  v.literal('pescatarian'),
  v.literal('vegetarian'),
  v.literal('vegan'),
)

/** Someone the household cooks for. Not every one of them has an account. */
export const householdPersonValidator = v.object({
  /** Stable within the household, so two members can edit different people. */
  id: v.string(),
  name: v.string(),
  age: v.optional(v.number()),
  diet: dietValidator,
  allergies: v.array(v.string()),
  dislikes: v.array(v.string()),
})

/** One line of a recipe's ingredient list. */
export const recipeIngredientValidator = v.object({
  /** As the recipe writes it: "25 g borstfilets van braadkip (beenhouwerij)". */
  text: v.string(),
  quantity: v.optional(v.number()),
  unit: v.optional(v.string()),
  /** "borstfilets van braadkip" */
  name: v.string(),
  /** What follows in brackets: "beenhouwerij". */
  note: v.optional(v.string()),
  /** The site's own ingredient id, when it has one (colruyt.be does). */
  sourceId: v.optional(v.string()),
})

/** One line of a shopping list. */
export const shoppingLineValidator = v.object({
  /** Stable within the list. */
  id: v.string(),
  /** A product bought before; unset for an ingredient no product matched. */
  productId: v.optional(v.id('products')),
  /** The product's receipt name, or the ingredient's. */
  name: v.string(),
  /** Pieces, or kg for a product sold by weight; in `unit` without a product. */
  quantity: v.optional(v.number()),
  unit: v.optional(v.string()),
  /** From the week's dinners, or added from the recommendations. */
  reason: v.union(v.literal('recipe'), v.literal('recommended')),
  /** For recipe lines: the ingredient lines it covers, with their recipe. */
  covers: v.array(v.string()),
})

export const householdRoleValidator = v.union(
  v.literal('owner'),
  v.literal('member'),
)

// ============================================================================
// Schema
// ============================================================================

export default defineSchema({
  ...authTables,

  // --------------------------------------------------------------------------
  // Users & Authentication
  // --------------------------------------------------------------------------

  users: defineTable({
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.id('_storage')),
    role: v.optional(roleValidator),
    permissionOverrides: v.optional(v.array(v.string())),
    bio: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    language: v.optional(v.string()), // Preferred language (e.g. 'nl', 'en')
    /**
     * Set when the user (or an admin) requested account deletion. The batched
     * deletion worker keeps running until the row itself is removed; the flag
     * lets a cron resume the cascade if a batch chain ever dies.
     */
    deletionRequestedAt: v.optional(v.number()),
  })
    .index('email', ['email'])
    .index('by_deletion_requested_at', ['deletionRequestedAt'])
    .index('by_role', ['role'])
    // User pickers search by name; email prefixes use the `email` index.
    .searchIndex('search_first_name', { searchField: 'firstName' })
    .searchIndex('search_last_name', { searchField: 'lastName' }),

  /**
   * Sign-in emails (verification codes, password-reset links) sent per
   * address, so the auth flows that send them without a password can't be
   * used to flood an inbox. See `authEmailSendDecision` in lib/auth.ts.
   */
  authEmailThrottles: defineTable({
    email: v.string(),
    kind: v.union(v.literal('verify'), v.literal('reset')),
    windowStart: v.number(),
    count: v.number(),
    lastSentAt: v.number(),
  }).index('by_email_and_kind', ['email', 'kind']),

  /**
   * Store-enforced release floor. There is at most one tiny policy document
   * per mobile platform, so the public query remains an indexed, cacheable
   * read regardless of user count.
   */
  mobileVersionPolicies: defineTable({
    platform: mobilePlatformValidator,
    minimumVersion: v.string(),
    minimumBuild: v.number(),
    storeUrl: v.string(),
    message: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_platform', ['platform']),

  // --------------------------------------------------------------------------
  // Storage Claims (who uploaded each blob — see lib/storageClaims.ts)
  // --------------------------------------------------------------------------

  storageClaims: defineTable({
    storageId: v.id('_storage'),
    userId: v.id('users'),
    claimedAt: v.number(),
  })
    .index('by_storage_id', ['storageId'])
    .index('by_user', ['userId']),

  // --------------------------------------------------------------------------
  // Households (see docs/PLAN.md, Phase 1)
  // --------------------------------------------------------------------------

  /**
   * The household profile every plan is made for. Each app user belongs to
   * exactly one household (see lib/households.ts).
   */
  households: defineTable({
    name: v.string(),
    people: v.array(householdPersonValidator),
    cookingMinutes: v.object({ weekday: v.number(), weekend: v.number() }),
    /** Unset when the household gave no budget. */
    budgetPerWeekCents: v.optional(v.number()),
    dinnersPerWeek: v.number(),
    cuisines: v.array(v.string()),
    lessMeat: v.boolean(),
    /**
     * Hosts of the recipe sites to plan from (see `CATALOG_SITES` in
     * lib/recipeCatalog.ts). Unset: all of them.
     */
    recipeSites: v.optional(v.array(v.string())),
    updatedAt: v.number(),
  }),

  householdMembers: defineTable({
    householdId: v.id('households'),
    userId: v.id('users'),
    role: householdRoleValidator,
    joinedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_household', ['householdId']),

  /**
   * An invitation to join a household. Joining takes the code and an account
   * with the invited address; the invite is deleted once used.
   */
  householdInvites: defineTable({
    householdId: v.id('households'),
    /** Normalised (see `normalizeEmail`). */
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
  })
    .index('by_code', ['code'])
    .index('by_household', ['householdId']),

  // --------------------------------------------------------------------------
  // Products and receipts (see docs/PLAN.md, Phase 2)
  // --------------------------------------------------------------------------

  /**
   * One row per Colruyt article, shared by all households: the article
   * number and name are the store's, not anyone's data. What a household
   * bought lives in its receipts and `productStats`.
   */
  products: defineTable({
    articleNumber: v.string(),
    /** As printed on the receipt, e.g. "BONI GER. EM.LIGHT 250G". */
    name: v.string(),
    /** Sold per kg; its quantities are in kg. */
    soldByWeight: v.boolean(),
    collectAndGoId: v.optional(v.string()),
    category: v.optional(v.string()),
  }).index('by_article_number', ['articleNumber']),

  receipts: defineTable({
    householdId: v.id('households'),
    /** The receipt's number in the export (KASTICKETNR_TS). */
    ticketNumber: v.string(),
    /** YYYY-MM-DD */
    date: v.string(),
    /** Colruyt store number, read from the ticket number. */
    store: v.string(),
    totalCents: v.number(),
  })
    .index('by_household_and_ticket', ['householdId', 'ticketNumber'])
    .index('by_household_and_date', ['householdId', 'date']),

  receiptLines: defineTable({
    householdId: v.id('households'),
    receiptId: v.id('receipts'),
    productId: v.id('products'),
    /** The receipt's date, so stats read a product's lines in order. */
    date: v.string(),
    /** Pieces, or kg for a product sold by weight. */
    quantity: v.number(),
    /** What was paid for the line, discounts included. */
    amountCents: v.number(),
  })
    .index('by_receipt', ['receiptId'])
    .index('by_household_and_product', ['householdId', 'productId', 'date']),

  /**
   * What a household buys of a product, derived from its receipt lines (see
   * lib/productStats.ts). Rebuilt after every import.
   */
  productStats: defineTable({
    householdId: v.id('households'),
    productId: v.id('products'),
    /** Copied from the product, for search and listing. */
    name: v.string(),
    soldByWeight: v.boolean(),
    /** Days the product was bought on. */
    timesBought: v.number(),
    totalQuantity: v.number(),
    totalSpentCents: v.number(),
    firstBoughtOn: v.string(),
    lastBoughtOn: v.string(),
    /** Days between purchases, once bought on two days or more. */
    averageIntervalDays: v.optional(v.number()),
    averageQuantity: v.number(),
    /** Per piece, or per kg. */
    lastUnitPriceCents: v.optional(v.number()),
  })
    .index('by_household_and_product', ['householdId', 'productId'])
    .index('by_household_and_times_bought', ['householdId', 'timesBought'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['householdId'],
    }),

  // --------------------------------------------------------------------------
  // Recipes (see docs/PLAN.md, Phase 3)
  // --------------------------------------------------------------------------

  /**
   * A recipe read from a site's page, shared by all households: recipes are
   * the site's public content. What a household keeps is in
   * `householdRecipes`.
   */
  recipes: defineTable({
    /** Canonical page address; one recipe per page. */
    url: v.string(),
    /** Without "www.", e.g. "colruyt.be". */
    host: v.string(),
    title: v.string(),
    servings: v.optional(v.number()),
    totalMinutes: v.optional(v.number()),
    /** The site's own course label, e.g. "Hoofdgerecht". */
    course: v.optional(v.string()),
    /** A dinner: a main course, or a page that doesn't say. */
    isMain: v.boolean(),
    ingredients: v.array(recipeIngredientValidator),
    steps: v.array(v.string()),
    tags: v.array(v.string()),
    imageUrl: v.optional(v.string()),
    /** How it was read: the page's recipe data, or Claude from its text. */
    extractedBy: v.union(v.literal('json-ld'), v.literal('claude')),
    fetchedAt: v.number(),
  }).index('by_url', ['url']),

  /** A household's saved recipes. */
  householdRecipes: defineTable({
    householdId: v.id('households'),
    recipeId: v.id('recipes'),
    addedAt: v.number(),
    /** Marked as a favourite by a household member. */
    favourite: v.optional(v.boolean()),
  })
    .index('by_household', ['householdId', 'addedAt'])
    .index('by_household_and_recipe', ['householdId', 'recipeId']),

  // --------------------------------------------------------------------------
  // Meal plans (see docs/PLAN.md, Phase 4)
  // --------------------------------------------------------------------------

  /**
   * The names and addresses of all of a site's recipes, from its sitemap,
   * stored as a JSON file (~10,000 entries for colruyt.be) and refreshed
   * weekly. Suggestions pick candidates from it before reading any page.
   */
  recipeCatalogs: defineTable({
    host: v.string(),
    storageId: v.id('_storage'),
    count: v.number(),
    refreshedAt: v.number(),
  }).index('by_host', ['host']),

  /**
   * A household's dinners for a week: suggested (in three steps, see
   * functions/mealPlans.ts), then picked and confirmed.
   */
  mealPlans: defineTable({
    householdId: v.id('households'),
    /** The Monday the week starts on, YYYY-MM-DD (Belgian time). */
    weekStart: v.string(),
    status: v.union(
      v.literal('suggesting'),
      v.literal('choosing'),
      v.literal('confirmed'),
      v.literal('failed'),
    ),
    /** While suggesting: which step, and how far. */
    progress: v.optional(
      v.object({
        step: v.union(
          v.literal('finding'),
          v.literal('reading'),
          v.literal('choosing'),
        ),
        done: v.number(),
        total: v.number(),
      }),
    ),
    /** Recipe pages picked by name, to read and check. */
    candidates: v.array(v.string()),
    /** Candidates read so far that are dinners. */
    readRecipeIds: v.array(v.id('recipes')),
    suggestions: v.array(
      v.object({
        recipeId: v.id('recipes'),
        reason: v.string(),
        picked: v.boolean(),
        servings: v.number(),
      }),
    ),
    /** Fitting recipes held back to replace a suggestion. */
    spares: v.array(
      v.object({ recipeId: v.id('recipes'), reason: v.string() }),
    ),
    /** Replaced suggestions, not suggested again this week. */
    rejected: v.array(v.id('recipes')),
    /** Why there are fewer suggestions than asked for. */
    note: v.optional(v.string()),
    error: v.optional(v.string()),
    /** What this run's Claude calls cost so far, in US dollars. */
    claudeCostUsd: v.optional(v.number()),
    /** Bumped on every (re)start; steps from an older run stop themselves. */
    runId: v.number(),
    updatedAt: v.number(),
  }).index('by_household_and_week', ['householdId', 'weekStart']),

  // --------------------------------------------------------------------------
  // Shopping lists (see docs/PLAN.md, Phase 5)
  // --------------------------------------------------------------------------

  /**
   * What a household buys for a week: the week's dinners turned into
   * products (see functions/shoppingLists.ts), plus recommended products
   * it added.
   */
  shoppingLists: defineTable({
    householdId: v.id('households'),
    /** The Monday the week starts on, YYYY-MM-DD (Belgian time). */
    weekStart: v.string(),
    /** `building` while the dinners are turned into products. */
    status: v.union(
      v.literal('building'),
      v.literal('ready'),
      v.literal('failed'),
    ),
    lines: v.array(shoppingLineValidator),
    /** Ingredients most kitchens have, to check before shopping. */
    pantry: v.array(v.string()),
    error: v.optional(v.string()),
    /** What the last build's Claude call cost, in US dollars. */
    claudeCostUsd: v.optional(v.number()),
    /** Bumped on every build; a build from an older run stops itself. */
    runId: v.number(),
    updatedAt: v.number(),
  }).index('by_household_and_week', ['householdId', 'weekStart']),
})
