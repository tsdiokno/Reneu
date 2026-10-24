/**
 * Natural synthesis composition utilities.
 * Ensures generated and rendered thematic syntheses avoid mechanical meta-language
 * (e.g., "looking across [1] and [2] and [3]," "across [A], [B], and [C],") and distribute
 * references organically at the natural resting points of ideas.
 */

export function cleanNaturalSynthesis(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';
  // Input bounding to prevent ReDoS / CPU starvation (CWE-1333, CWE-400)
  let text = rawText.trim().slice(0, 4000);

  // Pattern 1: Leading meta-phrases with bracket citations
  // Constrained quantifiers prevent catastrophic backtracking
  const leadingMetaRegex =
    /^(?:(?:when\s+)?looking\s+across|(?:when\s+)?reading\s+across|tracing\s+(?:the\s+(?:arc|movement|thread)\s+)?across|across|looking\s+at|bridging|connecting|in\s+both|seen\s+(?:together\s+)?in)\s+((?:\[[^\]]{1,80}\](?:\s*(?:,|and|&)\s*)*){1,20})[,\s—–:-]+\s*(.*)$/i;

  const match = text.match(leadingMetaRegex);
  if (match) {
    const rawCitations = match[1];
    let remainder = match[2]?.trim() || '';

    if (remainder.length > 0) {
      // Capitalize first letter of the actual thought
      remainder = remainder.charAt(0).toUpperCase() + remainder.slice(1);

      // Extract citation brackets
      const citations = (rawCitations.match(/\[[^\]]+\]/g) || []).filter(Boolean);

      // Distribute missing citations across sentences in the remainder
      const missingCitations = citations.filter((c) => !remainder.includes(c));

      if (missingCitations.length > 0) {
        // Split remainder into sentences
        const sentences = remainder.split(/(?<=[.!?])\s+/);
        if (sentences.length > 1) {
          // Distribute citations across the sentences
          const citationsPerSentence: string[][] = Array.from({ length: sentences.length }, () => []);
          missingCitations.forEach((cite, idx) => {
            const targetSentenceIdx = Math.min(idx, sentences.length - 1);
            citationsPerSentence[targetSentenceIdx].push(cite);
          });

          remainder = sentences
            .map((sentence, idx) => {
              const toAdd = citationsPerSentence[idx];
              if (!toAdd || toAdd.length === 0) return sentence;
              const punctMatch = sentence.match(/([.!?]+)$/);
              if (punctMatch) {
                const punct = punctMatch[1];
                const base = sentence.slice(0, sentence.length - punct.length).trimEnd();
                return `${base} ${toAdd.join(' ')}${punct}`;
              }
              return `${sentence} ${toAdd.join(' ')}`;
            })
            .join(' ');
        } else {
          // Single sentence
          const punctMatch = remainder.match(/([.!?]+)$/);
          if (punctMatch) {
            const punct = punctMatch[1];
            const base = remainder.slice(0, remainder.length - punct.length).trimEnd();
            remainder = `${base} ${missingCitations.join(' ')}${punct}`;
          } else {
            remainder = `${remainder} ${missingCitations.join(' ')}`;
          }
        }
      }

      text = remainder;
    }
  }

  // Pattern 2: Replace any remaining mid-sentence "looking across [A] and [B]"
  text = text.replace(
    /\b(?:looking\s+across|across)\s+((?:\[[^\]]+\](?:\s*(?:and|&|,)\s*)+\[[^\]]+\]))/gi,
    (_m, group) => {
      const cites = group.match(/\[[^\]]+\]/g) || [];
      return cites.join(' ');
    }
  );

  return text.trim();
}
