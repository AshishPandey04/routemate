/**
 * Admin access: role ADMIN or email listed in ADMIN_EMAILS (comma-separated).
 */
export function isAdminUser(user) {
  if (!user) return false
  if (user.role === 'ADMIN') return true

  const list = process.env.ADMIN_EMAILS || ''
  const emails = list.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return emails.includes((user.email || '').toLowerCase())
}

export function requireAdmin(user) {
  if (!isAdminUser(user)) {
    return { error: 'Admin access required', status: 403 }
  }
  return null
}
