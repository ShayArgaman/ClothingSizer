import Anthropic from '@anthropic-ai/sdk'
import type { WardrobeDimensions, WardrobeElement } from '../types/wardrobe.types'
import { getUnusedSpace, validateLayout } from '../utils/validation'

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY as string,
  dangerouslyAllowBrowser: true,
})

export interface AgentContext {
  wardrobe: WardrobeDimensions
  elements: WardrobeElement[]
}

function buildSystemPrompt(ctx: AgentContext): string {
  const errors = validateLayout(ctx.elements, ctx.wardrobe)
  const unusedCm2 = getUnusedSpace(ctx.elements, ctx.wardrobe)
  const elementSummary =
    ctx.elements.length === 0
      ? 'טרם הוספו רכיבים.'
      : ctx.elements
          .map(
            (el) =>
              `- ${el.label} (${el.type}): ${el.width}×${el.height} ס״מ במיקום (${el.x}, ${el.y}), עומק ${el.depth} ס״מ, חומר: ${el.material}`
          )
          .join('\n')

  return `אתה מעצב ארונות מקצועי ומומחה לניצול חלל. אתה עוזר למשתמשים לעצב ארונות יעילים ויפים.

**חשוב: ענה תמיד בעברית בלבד.**

## עיצוב הארון הנוכחי
**מסגרת הארון:** ${ctx.wardrobe.width} ס״מ רוחב × ${ctx.wardrobe.height} ס״מ גובה × ${ctx.wardrobe.depth} ס״מ עומק

**רכיבים מוצבים (${ctx.elements.length}):**
${elementSummary}

**שטח פנוי:** ~${Math.round(unusedCm2 / 100)} ד״מ²
${errors.length > 0 ? `**בעיות שנמצאו:**\n${errors.map((e) => `- ${e.message}`).join('\n')}` : '**לא נמצאו בעיות בפריסה.**'}

## יכולותיך
- להציע הוספת רכיבים ספציפיים עם מידות מדויקות בס״מ
- לזהות חוסר יעילות ושטח בלתי מנוצל
- להמליץ על גבהים ארגונומיים (מוט תלייה: 100–120 ס״מ לבגדים ארוכים, 50–60 ס״מ לקצרים; מדפים: 30–40 ס״מ מרווח)
- לענות על שאלות לגבי מידות ארון סטנדרטיות ושיטות עבודה מומלצות

## סגנון תשובה
- תמציתי וספציפי (ציין מידות מדויקות בס״מ)
- השתמש בנקודות תבליט
- התחל עם ההמלצה החשובה ביותר
- אם הארון ריק, הצע פריסה מתחילה`
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function sendMessage(
  userMessage: string,
  history: Message[],
  context: AgentContext,
  onStream: (text: string) => void
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: buildSystemPrompt(context),
    messages,
  })

  let full = ''
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      full += chunk.delta.text
      onStream(chunk.delta.text)
    }
  }

  return full
}
