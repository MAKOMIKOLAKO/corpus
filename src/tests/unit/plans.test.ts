import { canAddFeed, getUserLimits } from '@/lib/plans'

describe('plans feed limits', () => {
  it('limits FREE users to one RSS feed', () => {
    expect(getUserLimits('FREE').maxFeeds).toBe(1)
    expect(canAddFeed('FREE', 0)).toEqual({ allowed: true })
    expect(canAddFeed('FREE', 1)).toEqual({
      allowed: false,
      reason: 'feed_limit_reached'
    })
  })

  it('does not limit PRO users by feed count', () => {
    expect(getUserLimits('PRO').maxFeeds).toBe(Infinity)
    expect(canAddFeed('PRO', 10_000)).toEqual({ allowed: true })
  })
})
