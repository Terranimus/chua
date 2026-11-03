// Rate limits of the temple. The temple is free for everyone, forever: one limit for all, there are no paid tiers.
// It only stops bursts and bots. Numbers are per person, not per connection.
export const LIMITS = { actsPerMin: 24, burst: 6, chatPerMin: 20, dailyMerit: 2000 }
export const MAX_SOCKETS_PER_IP = 6
