import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-otter-key')
  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 400 })

  // Otter uses Basic auth with email:password encoded in base64
  // If the key contains a colon, treat as email:password, otherwise try as bearer token
  const isEmailPassword = apiKey.includes(':')
  const authHeader = isEmailPassword
    ? `Basic ${Buffer.from(apiKey).toString('base64')}`
    : `Bearer ${apiKey}`

  const endpoints = [
    'https://api.otter.ai/v2/speeches',
    'https://api.otter.ai/v1/speeches',
    'https://api.otter.ai/v2/transcripts',
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(`${url}?page_size=20`, {
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data)
      }
    } catch { /* try next endpoint */ }
  }

  return NextResponse.json({
    error: 'Could not connect to Otter.ai API. Please enter your credentials as email:password (e.g. you@email.com:yourpassword)'
  }, { status: 404 })
}
