import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { transcript } = await req.json()
  if (!transcript) return NextResponse.json({ error: 'No transcript provided' }, { status: 400 })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an assistant that analyzes meeting transcripts for a personal injury law business development team.

Extract from this transcript:
1. ACTION ITEMS - specific tasks, follow-ups, or commitments someone needs to do
2. DISCUSSION TOPICS - important subjects, questions, or themes that were discussed or need follow-up

Return ONLY valid JSON in this exact format, nothing else:
{
  "actionItems": ["action item 1", "action item 2"],
  "topics": ["topic 1", "topic 2"]
}

Keep each item concise (under 15 words). Extract up to 10 action items and 8 topics.

TRANSCRIPT:
${transcript.slice(0, 8000)}`
      }]
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
