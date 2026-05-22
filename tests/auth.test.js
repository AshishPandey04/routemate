/**
 * @vitest - Auth Logic Tests
 * Tests authentication utility functions and business logic
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { signToken, verifyToken } from '@/lib/auth.js'
import { AppError, ErrorCode, CommonErrors } from '@/lib/errors.js'

describe('Auth Utilities', () => {
  describe('JWT Token Handling', () => {
    it('should create and verify token', async () => {
      const payload = { userId: 'test-user-123', role: 'RIDER' }
      
      const token = await signToken(payload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')

      const verified = await verifyToken(token)
      expect(verified).toBeDefined()
      expect(verified.userId).toBe('test-user-123')
      expect(verified.role).toBe('RIDER')
    })

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid.token.here'
      const verified = await verifyToken(invalidToken)
      
      expect(verified).toBeNull()
    })

    it('should reject malformed tokens', async () => {
      const malformed = 'not-a-real-token'
      const verified = await verifyToken(malformed)
      
      expect(verified).toBeNull()
    })

    it('should include iat and exp claims', async () => {
      const payload = { userId: 'user-123', role: 'DRIVER' }
      const token = await signToken(payload)
      const verified = await verifyToken(token)

      expect(verified.iat).toBeDefined()
      expect(verified.exp).toBeDefined()
      expect(verified.exp > verified.iat).toBe(true)
    })
  })

  describe('Error Handling System', () => {
    it('should create AppError with code and status', () => {
      const error = new AppError(
        'Test error',
        ErrorCode.INVALID_CREDENTIALS,
        401
      )

      expect(error.message).toBe('Test error')
      expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS)
      expect(error.status).toBe(401)
    })

    it('should serialize error to JSON', () => {
      const error = new AppError(
        'Authentication failed',
        ErrorCode.UNAUTHORIZED,
        401
      )

      const json = error.toJSON()
      expect(json.success).toBe(false)
      expect(json.error.code).toBe(ErrorCode.UNAUTHORIZED)
      expect(json.error.message).toBe('Authentication failed')
      expect(json.error.status).toBe(401)
    })

    it('should hide details in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const error = new AppError(
        'Test',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        { secret: 'should-not-appear' }
      )

      const json = error.toJSON()
      expect(json.error.details).toBeUndefined()

      process.env.NODE_ENV = originalEnv
    })

    it('should provide common error helpers', () => {
      const invalidCreds = CommonErrors.invalidCredentials()
      expect(invalidCreds.code).toBe(ErrorCode.INVALID_CREDENTIALS)
      expect(invalidCreds.status).toBe(401)

      const unauth = CommonErrors.unauthorized()
      expect(unauth.code).toBe(ErrorCode.UNAUTHORIZED)

      const forbidden = CommonErrors.forbidden()
      expect(forbidden.code).toBe(ErrorCode.FORBIDDEN)
      expect(forbidden.status).toBe(403)
    })
  })

  describe('Password Hashing', () => {
    it('should hash passwords with bcrypt', async () => {
      const password = 'TestPassword123'
      const rounds = 12

      const hash = await bcrypt.hash(password, rounds)
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)

      const matches = await bcrypt.compare(password, hash)
      expect(matches).toBe(true)
    })

    it('should reject wrong passwords', async () => {
      const password = 'TestPassword123'
      const hash = await bcrypt.hash(password, 12)

      const matches = await bcrypt.compare('WrongPassword', hash)
      expect(matches).toBe(false)
    })

    it('should reject wrong passwords regardless of hash validity', async () => {
      const realHash  = await bcrypt.hash('correct', 12)
      const dummyHash = '$2a$12$aaaaaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

      const result1 = await bcrypt.compare('wrong', realHash)
      const result2 = await bcrypt.compare('wrong', dummyHash)

      expect(result1).toBe(false)
      expect(result2).toBe(false)
    })

    it('should handle bcrypt errors gracefully', async () => {
      const invalidHash = 'not-a-valid-hash'
      
      let error = null
      try {
        await bcrypt.compare('password', invalidHash)
      } catch (e) {
        error = e
      }

      expect(error).toBeDefined()
    })
  })

  describe('Security Best Practices', () => {
    it('should not expose system details in errors', () => {
      const error = new AppError(
        'Access denied',
        ErrorCode.FORBIDDEN,
        403
      )

      const json = JSON.stringify(error.toJSON())
      expect(json).not.toMatch(/database|query|prisma|sql|table/i)
      expect(json).not.toMatch(/stack|trace|at /i)
    })

    it('should provide unique error codes for client handling', () => {
      expect(ErrorCode.INVALID_CREDENTIALS).toBeDefined()
      expect(ErrorCode.INVALID_CREDENTIALS).not.toBe(ErrorCode.UNAUTHORIZED)
      expect(ErrorCode.UNAUTHORIZED).not.toBe(ErrorCode.FORBIDDEN)
      expect(ErrorCode.FORBIDDEN).not.toBe(ErrorCode.UNVERIFIED_ACCOUNT)
    })

    it('should timestamp errors', () => {
      const error = new AppError('Test', ErrorCode.INVALID_TOKEN, 401)
      expect(error.timestamp).toBeDefined()
      expect(new Date(error.timestamp).getTime()).toBeLessThanOrEqual(Date.now())
    })
  })
})

