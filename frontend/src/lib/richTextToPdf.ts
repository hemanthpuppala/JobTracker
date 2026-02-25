/**
 * Converts TipTap JSON content to @react-pdf/renderer <Text> children.
 *
 * TipTap JSON structure (simplified):
 * {
 *   type: 'doc',
 *   content: [
 *     {
 *       type: 'paragraph',
 *       content: [
 *         { type: 'text', text: 'Hello ', marks: [{ type: 'bold' }] },
 *         { type: 'text', text: 'world' }
 *       ]
 *     }
 *   ]
 * }
 *
 * We flatten all paragraphs into a single sequence of styled <Text> spans
 * (joined by spaces for multi-paragraph), suitable for react-pdf inline rendering.
 */
import { createElement } from 'react'
import { Text } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'

interface TipTapMark {
  type: 'bold' | 'italic' | 'underline' | string
  attrs?: Record<string, any>
}

interface TipTapTextNode {
  type: 'text'
  text: string
  marks?: TipTapMark[]
}

interface TipTapParagraph {
  type: 'paragraph'
  content?: TipTapTextNode[]
}

interface TipTapDoc {
  type: 'doc'
  content?: TipTapParagraph[]
}

/**
 * Convert a TipTap JSON doc into an array of react-pdf <Text> elements
 * with inline bold/italic/underline styles applied.
 *
 * @param json  TipTap JSON (from editor.getJSON())
 * @param baseStyle  Optional base style to apply to every span
 * @returns Array of React elements to place inside a parent <Text>
 */
export function richTextToPdfNodes(
  json: TipTapDoc | null | undefined,
  baseStyle?: Style,
): React.ReactNode[] {
  if (!json || !json.content) return []

  const nodes: React.ReactNode[] = []
  let key = 0

  for (let pIdx = 0; pIdx < json.content.length; pIdx++) {
    const paragraph = json.content[pIdx]

    // Insert space between paragraphs (TipTap creates separate paragraphs for newlines)
    if (pIdx > 0) {
      nodes.push(createElement(Text, { key: key++ }, ' '))
    }

    if (!paragraph.content) continue

    for (const textNode of paragraph.content) {
      if (textNode.type !== 'text') continue

      const style: Style = { ...(baseStyle || {}) }
      if (textNode.marks) {
        for (const mark of textNode.marks) {
          switch (mark.type) {
            case 'bold':
              style.fontWeight = 'bold'
              break
            case 'italic':
              style.fontStyle = 'italic'
              break
            case 'underline':
              style.textDecoration = 'underline'
              break
          }
        }
      }

      const hasStyle = textNode.marks && textNode.marks.length > 0
      nodes.push(
        createElement(Text, { key: key++, ...(hasStyle ? { style } : {}) }, textNode.text)
      )
    }
  }

  return nodes
}

/**
 * Check if a TipTap JSON doc has any formatting marks at all.
 * If not, we can skip rich rendering and use plain text for simplicity.
 */
export function hasRichFormatting(json: any): boolean {
  if (!json) return false
  const str = JSON.stringify(json)
  return str.includes('"marks"')
}
