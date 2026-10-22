/**
 * Households (see docs/PLAN.md, Phase 1)
 *
 * The household profile (the people we cook for, cooking time, budget,
 * dinners per week), its members, and invites to join it. Every member can
 * read and change all of it; see lib/households.ts for how membership works.
 */

import { query, mutation, internalAction } from '../_generated/server'
import type { Doc } from '../_generated/dataModel'
import { internal } from '../_generated/api'
import { v } from 'convex/values'
import { Resend as ResendAPI } from 'resend'
import {
  DEFAULT_EMAIL_FROM,
  MAX_EMAIL_LENGTH,
  getCurrentUser,
  getCurrentUserOrNull,
  normalizeEmail,
} from '../lib/auth'
import { permanentError } from '../lib/errors'
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_VALID_FOR_MS,
  getMembership,
  leaveHousehold,
  normalizeInviteCode,
  requireMyHousehold,
} from '../lib/households'
import { generateRandomString } from '../lib/random'
import { dietValidator } from '../schema'

// ============================================================================
// Limits
// ============================================================================

const MAX_NAME_LENGTH = 60
const MAX_PEOPLE = 12
const MAX_LIST_ITEMS = 30
const MAX_LIST_ITEM_LENGTH = 50
const MAX_AGE = 120
const MIN_COOKING_MINUTES = 5
const MAX_COOKING_MINUTES = 240
const MAX_DINNERS_PER_WEEK = 7
const MAX_BUDGET_CENTS = 2000_00

// ============================================================================
// Validation
// ============================================================================

function requireName(value: string, what: string): string {
  const name = value.trim()
  if (!name) throw permanentError('INVALID_ARGUMENT', `Enter ${what}.`)
  if (name.length > MAX_NAME_LENGTH) {
    throw permanentError(
      'INVALID_ARGUMENT',
      `Keep ${what} under ${MAX_NAME_LENGTH} characters.`,
    )
  }
  return name
}

/** Trimmed, without blanks or repeats (ignoring case), and within limits. */
function cleanList(values: string[], what: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of values) {
    const value = raw.trim()
    if (!value || seen.has(value.toLowerCase())) continue
    if (value.length > MAX_LIST_ITEM_LENGTH) {
      throw permanentError(
        'INVALID_ARGUMENT',
        `Keep each of the ${what} under ${MAX_LIST_ITEM_LENGTH} characters.`,
      )
    }
    seen.add(value.toLowerCase())
    result.push(value)
  }
  if (result.length > MAX_LIST_ITEMS) {
    throw permanentError(
      'INVALID_ARGUMENT',
      `List at most ${MAX_LIST_ITEMS} ${what}.`,
    )
  }
  return result
}

function requireWholeNumber(
  value: number,
  min: number,
  max: number,
  message: string,
): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw permanentError('INVALID_ARGUMENT', message)
  }
  return value
}

function requireEmailAddress(email: string): string {
  const normalized = normalizeEmail(email)
  if (
    normalized.length > MAX_EMAIL_LENGTH ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw permanentError('INVALID_ARGUMENT', 'Enter a valid email address.')
  }
  return normalized
}

function newPersonId(): string {
  return generateRandomString(10, 'abcdefghijklmnopqrstuvwxyz0123456789')
}

// ============================================================================
// Queries
// ============================================================================

function displayName(user: Doc<'users'> | null): string {
  if (!user) return 'Former member'
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return fullName || user.email || 'Member'
}

/**
 * The current user's household with its members and open invites, or null
 * when signed out or not set up yet.
 */
export const mine = query({
  args: {},
  handler: async ctx => {
    const user = await getCurrentUserOrNull(ctx)
    if (!user) return null
    const membership = await getMembership(ctx, user._id)
    const household = membership
      ? await ctx.db.get(membership.householdId)
      : null
    if (!membership || !household) return null

    const memberships = await ctx.db
      .query('householdMembers')
      .withIndex('by_household', q => q.eq('householdId', household._id))
      .collect()
    const members = await Promise.all(
      memberships
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map(async m => {
          const memberUser = await ctx.db.get(m.userId)
          return {
            userId: m.userId,
            name: displayName(memberUser),
            email: memberUser?.email ?? null,
            role: m.role,
            isMe: m.userId === user._id,
          }
        }),
    )
    const invites = await ctx.db
      .query('householdInvites')
      .withIndex('by_household', q => q.eq('householdId', household._id))
      .collect()

    return {
      household,
      myRole: membership.role,
      members,
      invites: invites.map(i => ({
        _id: i._id,
        email: i.email,
        code: i.code,
        expiresAt: i.expiresAt,
      })),
    }
  },
})

// ============================================================================
// Setting up and editing the profile
// ============================================================================

/**
 * Set up a household for a user who has none, with the user as its owner and
 * first person. Does nothing for a user who already has one.
 */
export const setUp = mutation({
  args: {},
  returns: v.id('households'),
  handler: async ctx => {
    const user = await getCurrentUser(ctx)
    const existing = await getMembership(ctx, user._id)
    if (existing) return existing.householdId

    const now = Date.now()
    const firstName = user.firstName?.trim()
    const householdId = await ctx.db.insert('households', {
      name: firstName ? `${firstName}'s household` : 'Our household',
      people: firstName
        ? [
            {
              id: newPersonId(),
              name: firstName,
              diet: 'everything',
              allergies: [],
              dislikes: [],
            },
          ]
        : [],
      cookingMinutes: { weekday: 30, weekend: 60 },
      dinnersPerWeek: 5,
      cuisines: [],
      lessMeat: false,
      updatedAt: now,
    })
    await ctx.db.insert('householdMembers', {
      householdId,
      userId: user._id,
      role: 'owner',
      joinedAt: now,
    })
    return householdId
  },
})

/**
 * Change the household's name and dinner preferences. Omitted fields are left
 * alone; `budgetPerWeekCents: null` removes the budget.
 */
export const updateSettings = mutation({
  args: {
    name: v.optional(v.string()),
    cookingMinutes: v.optional(
      v.object({ weekday: v.number(), weekend: v.number() }),
    ),
    budgetPerWeekCents: v.optional(v.union(v.number(), v.null())),
    dinnersPerWeek: v.optional(v.number()),
    cuisines: v.optional(v.array(v.string())),
    lessMeat: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { household } = await requireMyHousehold(ctx)
    const updates: Partial<Doc<'households'>> = { updatedAt: Date.now() }

    if (args.name !== undefined) {
      updates.name = requireName(args.name, 'a household name')
    }
    if (args.cookingMinutes !== undefined) {
      const message = `Cooking time is between ${MIN_COOKING_MINUTES} and ${MAX_COOKING_MINUTES} minutes.`
      updates.cookingMinutes = {
        weekday: requireWholeNumber(
          args.cookingMinutes.weekday,
          MIN_COOKING_MINUTES,
          MAX_COOKING_MINUTES,
          message,
        ),
        weekend: requireWholeNumber(
          args.cookingMinutes.weekend,
          MIN_COOKING_MINUTES,
          MAX_COOKING_MINUTES,
          message,
        ),
      }
    }
    if (args.budgetPerWeekCents !== undefined) {
      // Patching a field to undefined removes it.
      updates.budgetPerWeekCents =
        args.budgetPerWeekCents === null
          ? undefined
          : requireWholeNumber(
              args.budgetPerWeekCents,
              0,
              MAX_BUDGET_CENTS,
              'Enter a weekly budget up to € 2.000.',
            )
    }
    if (args.dinnersPerWeek !== undefined) {
      updates.dinnersPerWeek = requireWholeNumber(
        args.dinnersPerWeek,
        1,
        MAX_DINNERS_PER_WEEK,
        `Plan between 1 and ${MAX_DINNERS_PER_WEEK} dinners a week.`,
      )
    }
    if (args.cuisines !== undefined) {
      updates.cuisines = cleanList(args.cuisines, 'cuisines')
    }
    if (args.lessMeat !== undefined) updates.lessMeat = args.lessMeat

    await ctx.db.patch(household._id, updates)
    return null
  },
})

/**
 * Add someone the household cooks for, or with `id`, change them. Returns
 * their id.
 */
export const savePerson = mutation({
  args: {
    id: v.optional(v.string()),
    name: v.string(),
    age: v.optional(v.union(v.number(), v.null())),
    diet: dietValidator,
    allergies: v.array(v.string()),
    dislikes: v.array(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { household } = await requireMyHousehold(ctx)
    const person = {
      id: args.id ?? newPersonId(),
      name: requireName(args.name, 'a name'),
      age:
        args.age == null
          ? undefined
          : requireWholeNumber(
              args.age,
              0,
              MAX_AGE,
              `Enter an age between 0 and ${MAX_AGE}.`,
            ),
      diet: args.diet,
      allergies: cleanList(args.allergies, 'allergies'),
      dislikes: cleanList(args.dislikes, 'dislikes'),
    }

    let people: Doc<'households'>['people']
    if (args.id === undefined) {
      if (household.people.length >= MAX_PEOPLE) {
        throw permanentError(
          'INVALID_ARGUMENT',
          `A household can cook for at most ${MAX_PEOPLE} people.`,
        )
      }
      people = [...household.people, person]
    } else {
      if (!household.people.some(p => p.id === args.id)) {
        throw permanentError(
          'NOT_FOUND',
          'This person is no longer in your household.',
        )
      }
      people = household.people.map(p => (p.id === args.id ? person : p))
    }
    await ctx.db.patch(household._id, { people, updatedAt: Date.now() })
    return person.id
  },
})

export const removePerson = mutation({
  args: { id: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { household } = await requireMyHousehold(ctx)
    await ctx.db.patch(household._id, {
      people: household.people.filter(p => p.id !== args.id),
      updatedAt: Date.now(),
    })
    return null
  },
})

// ============================================================================
// Invites
// ============================================================================

/** Whether the deployment can send email (see .env.example). */
function canSendEmail(): boolean {
  return !!process.env.AUTH_RESEND_KEY
}

/**
 * Invite someone to the household by email address. Inviting an address again
 * replaces its open invite with a new code. Emails the code when the
 * deployment has a Resend key; `emailed` says whether it did, so the app can
 * offer to share the code instead.
 */
export const invite = mutation({
  args: { email: v.string() },
  returns: v.object({ code: v.string(), emailed: v.boolean() }),
  handler: async (ctx, args) => {
    const { household } = await requireMyHousehold(ctx)
    const email = requireEmailAddress(args.email)

    const memberships = await ctx.db
      .query('householdMembers')
      .withIndex('by_household', q => q.eq('householdId', household._id))
      .collect()
    for (const m of memberships) {
      const member = await ctx.db.get(m.userId)
      if (member?.email && normalizeEmail(member.email) === email) {
        throw permanentError(
          'INVALID_ARGUMENT',
          'This person is already in your household.',
        )
      }
    }

    const invites = await ctx.db
      .query('householdInvites')
      .withIndex('by_household', q => q.eq('householdId', household._id))
      .collect()
    for (const old of invites.filter(i => i.email === email)) {
      await ctx.db.delete(old._id)
    }

    const code = generateRandomString(INVITE_CODE_LENGTH, INVITE_CODE_ALPHABET)
    await ctx.db.insert('householdInvites', {
      householdId: household._id,
      email,
      code,
      expiresAt: Date.now() + INVITE_VALID_FOR_MS,
    })

    const emailed = canSendEmail()
    if (emailed) {
      await ctx.scheduler.runAfter(
        0,
        internal.functions.households.sendInviteEmail,
        { email, code, householdName: household.name },
      )
    }
    return { code, emailed }
  },
})

export const cancelInvite = mutation({
  args: { inviteId: v.id('householdInvites') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { household } = await requireMyHousehold(ctx)
    const invite = await ctx.db.get(args.inviteId)
    if (invite && invite.householdId === household._id) {
      await ctx.db.delete(invite._id)
    }
    return null
  },
})

/**
 * Join the household an invite code is for. The code only works for the
 * account with the invited address, so a code seen by someone else is of no
 * use to them. Joining leaves the user's current household, which is deleted
 * if nobody else is in it.
 */
export const join = mutation({
  args: { code: v.string() },
  returns: v.id('households'),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    const code = normalizeInviteCode(args.code)
    const invite = code
      ? await ctx.db
          .query('householdInvites')
          .withIndex('by_code', q => q.eq('code', code))
          .first()
      : null
    if (!invite || invite.expiresAt < Date.now()) {
      throw permanentError(
        'NOT_FOUND',
        'This code is wrong or has expired. Ask for a new invite.',
      )
    }
    if (!user.email || normalizeEmail(user.email) !== invite.email) {
      throw permanentError(
        'FORBIDDEN',
        `This invite is for ${invite.email}. Sign in with that address to use it.`,
      )
    }

    const current = await getMembership(ctx, user._id)
    if (current?.householdId !== invite.householdId) {
      await leaveHousehold(ctx, user._id)
      await ctx.db.insert('householdMembers', {
        householdId: invite.householdId,
        userId: user._id,
        role: 'member',
        joinedAt: Date.now(),
      })
    }
    await ctx.db.delete(invite._id)
    return invite.householdId
  },
})

export const sendInviteEmail = internalAction({
  args: { email: v.string(), code: v.string(), householdName: v.string() },
  returns: v.null(),
  handler: async (_ctx, { email, code, householdName }) => {
    const resend = new ResendAPI(process.env.AUTH_RESEND_KEY)
    const name = escapeHtml(householdName)
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? DEFAULT_EMAIL_FROM,
      to: [email],
      subject: `You're invited to ${householdName} on Personal Assistant`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1B1F27;">
          <h2 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">Join ${name}</h2>
          <p style="color: #48526D; font-size: 16px; line-height: 1.5;">
            You've been invited to plan dinners and shopping together in Personal Assistant.
            Sign up or sign in with this email address, then choose "Join a household" and enter this code:
          </p>
          <p style="text-align: center; margin: 32px 0;">
            <span style="display: inline-block; background: #F3F4FA; border: 2px solid #009A8E; border-radius: 10px; padding: 14px 32px; font-size: 28px; font-weight: 600; color: #1B1F27;">${code}</span>
          </p>
          <p style="color: #63708A; font-size: 14px; line-height: 1.5;">
            The code works for 14 days. Not expecting this? You can ignore this email.
          </p>
        </div>
      `,
      text: `You've been invited to join ${householdName} in Personal Assistant.\n\nSign up or sign in with this email address, choose "Join a household" and enter this code: ${code}\n\nThe code works for 14 days. Not expecting this? You can ignore this email.`,
    })
    if (error) {
      console.error('Failed to send invite email:', error)
      throw new Error('Could not send invite email')
    }
    return null
  },
})

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
