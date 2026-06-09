/**
 * API response utility for consistent response formatting
 */

import { NextResponse } from 'next/server'
import { AppError } from './errors.js'

/**
 * Send a successful response
 */
export function apiSuccess(data, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data
    },
    { status }
  )
}

/**
 * Send an error response
 */
export function apiError(error, status = 500) {
  if (error instanceof AppError) {
    const response = error.toJSON()
    return NextResponse.json(response, { status: error.status })
  }

  // Handle Prisma errors
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0]
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: `${field || 'Field'} already exists`,
          status: 400
        }
      },
      { status: 400 }
    )
  }

  // Handle generic errors
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        status: 500,
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      }
    },
    { status: 500 }
  )
}

/**
 * Wrapper for API routes with automatic error handling
 * Usage: export const POST = withErrorHandler(handler)
 */
export function withErrorHandler(handler) {
  return async (request) => {
    try {
      return await handler(request)
    } catch (error) {
      console.error('[API ERROR]', error.message)
      return apiError(error)
    }
  }
}
