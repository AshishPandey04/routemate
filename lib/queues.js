/**
 * Shared BullMQ queue instances for use in API routes.
 * Workers are separate processes — API routes only enqueue jobs here.
 */
import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

// Lazy singleton so the connection is only created server-side
let _connection = null

function getConnection() {
  if (!_connection) {
    _connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck:     false,
    })
  }
  return _connection
}

export function getRefundQueue() {
  return new Queue('refunds', {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff:  { type: 'exponential', delay: 30_000 },
      removeOnComplete: 100,
      removeOnFail:     200,
    },
  })
}
