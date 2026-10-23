import { describe, expect, it } from 'vitest'
import { api, internal } from '../convex/_generated/api'
import { DAY, expectPermanentError, userFixture } from './fixtures'

const person = {
  name: 'Mila',
  diet: 'vegetarian' as const,
  allergies: ['Peanuts', ' peanuts ', ''],
  dislikes: ['Olives'],
}

describe('setting up a household', () => {
  it('has none before set-up', async () => {
    const { authorClient } = await userFixture()
    expect(await authorClient.query(api.functions.households.mine)).toBeNull()
  })

  it('makes the user its owner and first person', async () => {
    const { authorClient } = await userFixture()
    await authorClient.mutation(api.functions.households.setUp)
    const mine = await authorClient.query(api.functions.households.mine)
    expect(mine?.household.name).toBe("Ada's household")
    expect(mine?.household.people.map(p => p.name)).toEqual(['Ada'])
    expect(mine?.myRole).toBe('owner')
    expect(mine?.members).toEqual([
      expect.objectContaining({ name: 'Ada', role: 'owner', isMe: true }),
    ])
  })

  it('does nothing the second time', async () => {
    const { t, authorClient } = await userFixture()
    const first = await authorClient.mutation(api.functions.households.setUp)
    const second = await authorClient.mutation(api.functions.households.setUp)
    expect(second).toBe(first)
    const households = await t.run(ctx => ctx.db.query('households').collect())
    expect(households).toHaveLength(1)
  })
})

describe('editing the profile', () => {
  it('adds, changes and removes people', async () => {
    const { authorClient } = await userFixture()
    await authorClient.mutation(api.functions.households.setUp)
    const id = await authorClient.mutation(
      api.functions.households.savePerson,
      person,
    )
    let people = (await authorClient.query(api.functions.households.mine))
      ?.household.people
    expect(people?.[1]).toMatchObject({
      id,
      name: 'Mila',
      allergies: ['Peanuts'],
      dislikes: ['Olives'],
    })

    await authorClient.mutation(api.functions.households.savePerson, {
      ...person,
      id,
      age: 7,
      diet: 'vegan',
    })
    people = (await authorClient.query(api.functions.households.mine))
      ?.household.people
    expect(people?.[1]).toMatchObject({ id, age: 7, diet: 'vegan' })

    await authorClient.mutation(api.functions.households.removePerson, { id })
    people = (await authorClient.query(api.functions.households.mine))
      ?.household.people
    expect(people?.map(p => p.name)).toEqual(['Ada'])
  })

  it('updates settings and clears the budget', async () => {
    const { authorClient } = await userFixture()
    await authorClient.mutation(api.functions.households.setUp)
    await authorClient.mutation(api.functions.households.updateSettings, {
      name: ' The Peeters ',
      cookingMinutes: { weekday: 20, weekend: 90 },
      budgetPerWeekCents: 120_00,
      dinnersPerWeek: 4,
      cuisines: ['Italian', 'italian', 'Thai'],
      lessMeat: true,
    })
    let household = (await authorClient.query(api.functions.households.mine))
      ?.household
    expect(household).toMatchObject({
      name: 'The Peeters',
      cookingMinutes: { weekday: 20, weekend: 90 },
      budgetPerWeekCents: 120_00,
      dinnersPerWeek: 4,
      cuisines: ['Italian', 'Thai'],
      lessMeat: true,
    })

    await authorClient.mutation(api.functions.households.updateSettings, {
      budgetPerWeekCents: null,
    })
    household = (await authorClient.query(api.functions.households.mine))
      ?.household
    expect(household?.budgetPerWeekCents).toBeUndefined()
    expect(household?.dinnersPerWeek).toBe(4)
  })

  it('chooses the recipe sites to plan from', async () => {
    const { authorClient } = await userFixture()
    await authorClient.mutation(api.functions.households.setUp)
    const selected = async () =>
      (await authorClient.query(api.functions.households.mine))?.recipeSites
        .filter(s => s.selected)
        .map(s => s.host)

    // Every site until the household chooses.
    expect(await selected()).toEqual(['colruyt.be', 'dagelijksekost.vrt.be'])
    await authorClient.mutation(api.functions.households.updateSettings, {
      recipeSites: ['dagelijksekost.vrt.be', 'dagelijksekost.vrt.be'],
    })
    expect(await selected()).toEqual(['dagelijksekost.vrt.be'])

    await expectPermanentError(
      authorClient.mutation(api.functions.households.updateSettings, {
        recipeSites: [],
      }),
      'INVALID_ARGUMENT',
    )
    await expectPermanentError(
      authorClient.mutation(api.functions.households.updateSettings, {
        recipeSites: ['example.com'],
      }),
      'INVALID_ARGUMENT',
    )
  })

  it('refuses values out of range', async () => {
    const { authorClient } = await userFixture()
    await authorClient.mutation(api.functions.households.setUp)
    await expectPermanentError(
      authorClient.mutation(api.functions.households.updateSettings, {
        dinnersPerWeek: 8,
      }),
      'INVALID_ARGUMENT',
    )
    await expectPermanentError(
      authorClient.mutation(api.functions.households.updateSettings, {
        name: '  ',
      }),
      'INVALID_ARGUMENT',
    )
    await expectPermanentError(
      authorClient.mutation(api.functions.households.savePerson, {
        ...person,
        age: -1,
      }),
      'INVALID_ARGUMENT',
    )
  })

  it('needs a household first', async () => {
    const { authorClient } = await userFixture()
    await expectPermanentError(
      authorClient.mutation(api.functions.households.savePerson, person),
      'NOT_FOUND',
    )
  })
})

describe('invites', () => {
  async function invited() {
    const fixture = await userFixture()
    await fixture.authorClient.mutation(api.functions.households.setUp)
    await fixture.playerClient.mutation(api.functions.households.setUp)
    const { code, emailed } = await fixture.authorClient.mutation(
      api.functions.households.invite,
      { email: ' Pia@Example.test ' },
    )
    return { ...fixture, code, emailed }
  }

  it('lets the invited address join and see the same profile', async () => {
    const { t, authorClient, playerClient, code, emailed } = await invited()
    expect(emailed).toBe(false)
    await authorClient.mutation(api.functions.households.savePerson, person)

    await playerClient.mutation(api.functions.households.join, {
      code: `${code.slice(0, 4)}-${code.slice(4).toLowerCase()}`,
    })

    const forAuthor = await authorClient.query(api.functions.households.mine)
    const forPlayer = await playerClient.query(api.functions.households.mine)
    expect(forPlayer?.household).toEqual(forAuthor?.household)
    expect(forPlayer?.myRole).toBe('member')
    expect(forAuthor?.members.map(m => m.name)).toEqual(['Ada', 'Pia'])
    expect(forAuthor?.invites).toEqual([])
    // Pia's own household had nobody else in it.
    const households = await t.run(ctx => ctx.db.query('households').collect())
    expect(households).toHaveLength(1)
  })

  it('lets any member edit the shared profile', async () => {
    const { authorClient, playerClient, code } = await invited()
    await playerClient.mutation(api.functions.households.join, { code })
    await playerClient.mutation(api.functions.households.updateSettings, {
      dinnersPerWeek: 3,
    })
    const mine = await authorClient.query(api.functions.households.mine)
    expect(mine?.household.dinnersPerWeek).toBe(3)
  })

  it('refuses another account', async () => {
    const { t, code } = await invited()
    const otherId = await t.run(ctx =>
      ctx.db.insert('users', { firstName: 'Ola', email: 'ola@example.test' }),
    )
    await expectPermanentError(
      t
        .withIdentity({ subject: otherId })
        .mutation(api.functions.households.join, { code }),
      'FORBIDDEN',
    )
  })

  it('refuses an expired or wrong code', async () => {
    const { t, playerClient, code } = await invited()
    await expectPermanentError(
      playerClient.mutation(api.functions.households.join, {
        code: 'WRONG123',
      }),
      'NOT_FOUND',
    )
    await t.run(async ctx => {
      const invite = await ctx.db
        .query('householdInvites')
        .withIndex('by_code', q => q.eq('code', code))
        .first()
      await ctx.db.patch(invite!._id, { expiresAt: Date.now() - DAY })
    })
    await expectPermanentError(
      playerClient.mutation(api.functions.households.join, { code }),
      'NOT_FOUND',
    )
  })

  it('replaces the open invite when the address is invited again', async () => {
    const { authorClient, playerClient, code } = await invited()
    const again = await authorClient.mutation(api.functions.households.invite, {
      email: 'pia@example.test',
    })
    const mine = await authorClient.query(api.functions.households.mine)
    expect(mine?.invites.map(i => i.code)).toEqual([again.code])
    await expectPermanentError(
      playerClient.mutation(api.functions.households.join, { code }),
      'NOT_FOUND',
    )
  })

  it('refuses inviting a member', async () => {
    const { authorClient } = await invited()
    await expectPermanentError(
      authorClient.mutation(api.functions.households.invite, {
        email: 'ada@example.test',
      }),
      'INVALID_ARGUMENT',
    )
  })

  it('lets a member cancel an invite', async () => {
    const { authorClient } = await invited()
    const [open] =
      (await authorClient.query(api.functions.households.mine))?.invites ?? []
    await authorClient.mutation(api.functions.households.cancelInvite, {
      inviteId: open!._id,
    })
    const mine = await authorClient.query(api.functions.households.mine)
    expect(mine?.invites).toEqual([])
  })
})

describe('deleting an account', () => {
  it('hands the household to the next member', async () => {
    const { t, author, authorClient, playerClient, code } = await (async () => {
      const fixture = await userFixture()
      await fixture.authorClient.mutation(api.functions.households.setUp)
      const { code } = await fixture.authorClient.mutation(
        api.functions.households.invite,
        { email: 'pia@example.test' },
      )
      return { ...fixture, code }
    })()
    await playerClient.mutation(api.functions.households.join, { code })

    await t.mutation(internal.functions.users.processAccountDeletion, {
      userId: author,
    })

    const mine = await playerClient.query(api.functions.households.mine)
    expect(mine?.myRole).toBe('owner')
    expect(mine?.members.map(m => m.name)).toEqual(['Pia'])
    expect(await authorClient.query(api.functions.households.mine)).toBeNull()
  })

  it('deletes a household nobody else is in', async () => {
    const { t, author, authorClient } = await userFixture()
    await authorClient.mutation(api.functions.households.setUp)
    await authorClient.mutation(api.functions.households.invite, {
      email: 'someone@example.test',
    })
    await t.mutation(internal.functions.users.processAccountDeletion, {
      userId: author,
    })
    const rows = await t.run(async ctx => ({
      households: await ctx.db.query('households').collect(),
      members: await ctx.db.query('householdMembers').collect(),
      invites: await ctx.db.query('householdInvites').collect(),
    }))
    expect(rows).toEqual({ households: [], members: [], invites: [] })
  })
})
