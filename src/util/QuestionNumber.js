/**
 * Quotation Number Generator & Helper Utilities
 * 
 * Rules:
 * 1. Spares Quotation Format: EHPINDIA/TSV/VV/{SEQ}/SPARES
 * 2. Scales Quotation Format: EHPINDIA/TSV/VV/{SEQ}/AAA
 * 3. Sequence Strategy: Lowest missing / available sequence number starting from base
 *    (Allows reusing sequence numbers after deletion, while preventing duplicates if present).
 */

export const SCALE_PREFIX = 'EHPINDIA/TSV/VV/'
export const SCALE_SUFFIX = '/AAA'

export const SPARE_PREFIX = 'EHPINDIA/TSV/VV/'
export const SPARE_SUFFIX = '/SPARES'

/**
 * Extracts the numeric sequence from a quotation number string.
 * @param {string} quoteNo 
 * @param {'scale' | 'spares' | 'Spare Parts'} [type]
 * @returns {number | null}
 */
export const extractSequenceNumber = (quoteNo, type = 'scale') => {
  if (!quoteNo || typeof quoteNo !== 'string') return null
  const trimmed = quoteNo.trim()

  const isSpareType = type === 'spares' || type === 'Spare Parts'
  const prefix = isSpareType ? SPARE_PREFIX : SCALE_PREFIX
  const suffix = isSpareType ? SPARE_SUFFIX : SCALE_SUFFIX
  const legacyPrefix = `${prefix}LV/`
  const lowerQuoteNo = trimmed.toLowerCase()
  const lowerLegacyPrefix = legacyPrefix.toLowerCase()
  const lowerPrefix = prefix.toLowerCase()
  const lowerSuffix = suffix.toLowerCase()

  if (lowerQuoteNo.endsWith(lowerSuffix)) {
    let sequence = null
    if (lowerQuoteNo.startsWith(lowerLegacyPrefix)) {
      sequence = trimmed.slice(legacyPrefix.length, -suffix.length)
    } else if (lowerQuoteNo.startsWith(lowerPrefix)) {
      sequence = trimmed.slice(prefix.length, -suffix.length)
    }
    if (sequence !== null) {
      return /^\d+$/.test(sequence) ? parseInt(sequence, 10) : null
    }
  }

  if (isSpareType) {
    // Match .../064/SPARES or .../026/SPARES
    const match = trimmed.match(/\/(\d+)\/SPARES/i)
    if (match) return parseInt(match[1], 10)
  } else {
    // Match .../044/AAA or .../047/AAA
    const match = trimmed.match(/\/(\d+)\/AAA/i)
    if (match) return parseInt(match[1], 10)
  }

  // General slash extraction fallback for older quotation formats.
  const slashParts = trimmed.split('/')
  if (slashParts.length >= 3) {
    const candidate = slashParts[slashParts.length - 2].trim()
    const parsed = parseInt(candidate, 10)
    if (!isNaN(parsed)) return parsed
  }

  // Fallback: match any digits preceded by slash
  const slashDigitMatch = trimmed.match(/\/(\d+)/)
  if (slashDigitMatch) {
    const parsed = parseInt(slashDigitMatch[1], 10)
    if (!isNaN(parsed)) return parsed
  }

  // Legacy fallback: QT-2026-001 or ehp-2026-005
  const hyphenParts = trimmed.split('-')
  if (hyphenParts.length >= 2) {
    const lastPart = hyphenParts[hyphenParts.length - 1].trim()
    const parsed = parseInt(lastPart, 10)
    if (!isNaN(parsed)) return parsed
  }

  // General digits fallback
  const anyDigits = trimmed.match(/\b\d{3,}\b/)
  if (anyDigits) {
    const parsed = parseInt(anyDigits[0], 10)
    if (!isNaN(parsed)) return parsed
  }

  return null
}

/**
 * Generates the next quotation number sequentially based on existing records.
 * If quotations exist, auto-increments from highest (max + 1).
 * If no quotations exist yet, begins with 1 (001).
 * @param {Array<object>} allQuotations - List of quotations from database
 * @param {'scale' | 'spares' | 'Spare Parts'} [type='scale'] - 'scale' or 'spares'
 * @returns {string} Formatted quotation number
 */
export const generateNextQuotationNumber = (allQuotations = [], type = 'scale') => {
  const isSpareType = type === 'spares' || type === 'Spare Parts'

  let maxSeq = 0
  const existingSeqs = new Set()

  if (Array.isArray(allQuotations)) {
    allQuotations.forEach(q => {
      if (!q || !q.quoteNo) return

      // Identify whether this quote belongs to spares or scale
      const quoteIsSpare = 
        q.productType === 'Spare Parts' || 
        /\/SPARES/i.test(q.quoteNo) || 
        /SPARE/i.test(q.quoteNo)

      if (quoteIsSpare !== isSpareType) {
        return // Skip quotation from the other product type
      }

      const seq = extractSequenceNumber(q.quoteNo, type)
      if (seq !== null && !isNaN(seq)) {
        existingSeqs.add(seq)
        if (seq > maxSeq) {
          maxSeq = seq
        }
      }
    })
  }

  // Start with 1 if no existing quotations of this type exist;
  // otherwise auto-increment from highest existing sequence (maxSeq + 1)
  let nextSeq = maxSeq > 0 ? (maxSeq + 1) : 1

  // Ensure no collision with any existing sequence
  while (existingSeqs.has(nextSeq)) {
    nextSeq++
  }

  const paddedSeq = String(nextSeq).padStart(3, '0')

  if (isSpareType) {
    return `${SPARE_PREFIX}${paddedSeq}${SPARE_SUFFIX}`
  }
  return `${SCALE_PREFIX}${paddedSeq}${SCALE_SUFFIX}`
}

/**
 * Checks if a quotation number already exists in active records.
 * @param {string} quoteNo 
 * @param {Array<object>} allQuotations 
 * @param {string|null} [currentId=null] - Exclude current quotation when in edit mode
 * @returns {boolean}
 */
export const isQuotationNumberExists = (quoteNo, allQuotations = [], currentId = null) => {
  if (!quoteNo || !Array.isArray(allQuotations)) return false
  const target = quoteNo.trim().toLowerCase()

  return allQuotations.some(q => {
    if (!q || !q.quoteNo) return false
    const qId = (q._id || q.id || '').toString()
    if (currentId && qId && qId === currentId.toString()) {
      return false
    }
    return q.quoteNo.trim().toLowerCase() === target
  })
}

/**
 * Sanitizes quotation filename for downloading without illegal path characters.
 * @param {string} prefix 
 * @param {string} quoteNo 
 * @returns {string}
 */
export const getSafeQuotationFilename = (prefix = 'Quotation', quoteNo = 'Preview') => {
  const safeQuoteNo = (quoteNo || 'Preview').replace(/[\/\\]/g, '-')
  return `${prefix}-${safeQuoteNo}`
}

/**
 * Splits a quotation number into prefix, numeric sequence string, and suffix parts.
 * @param {string} quoteNo 
 * @param {'scale' | 'spares' | 'Spare Parts'} [type='scale'] 
 * @returns {{ prefix: string, seqStr: string, suffix: string }}
 */
export const parseQuotationNumberParts = (quoteNo, type = 'scale') => {
  const isSpareType = type === 'spares' || type === 'Spare Parts'
  const defaultPrefix = isSpareType ? SPARE_PREFIX : SCALE_PREFIX
  const defaultSuffix = isSpareType ? SPARE_SUFFIX : SCALE_SUFFIX

  if (!quoteNo || typeof quoteNo !== 'string') {
    return { prefix: defaultPrefix, seqStr: '', suffix: defaultSuffix }
  }

  const trimmed = quoteNo.trim()

  const suffixPattern = isSpareType ? SPARE_SUFFIX : SCALE_SUFFIX
  const normalizedNumber = trimmed.match(new RegExp(`(${suffixPattern})$`, 'i'))
  if (normalizedNumber) {
    const numberBody = trimmed.slice(0, -normalizedNumber[1].length)
    const legacyPrefix = `${defaultPrefix}LV/`
    if (numberBody.toLowerCase().startsWith(legacyPrefix.toLowerCase())) {
      return {
        prefix: defaultPrefix,
        seqStr: numberBody.slice(legacyPrefix.length),
        suffix: normalizedNumber[1].toUpperCase()
      }
    }
    if (numberBody.toLowerCase().startsWith(defaultPrefix.toLowerCase())) {
      return {
        prefix: defaultPrefix,
        seqStr: numberBody.slice(defaultPrefix.length),
        suffix: normalizedNumber[1].toUpperCase()
      }
    }
  }

  // Match a text or numeric sequence, also accepting legacy prefixes containing /LV/.
  const match = trimmed.match(new RegExp(`^(.*\\/)([^/]+)(${suffixPattern})$`, 'i'))
  if (match) {
    const prefix = match[1].replace(/LV\/$/i, '')
    return { prefix, seqStr: match[2], suffix: match[3].toUpperCase() }
  }

  // Fallback pattern for older quotation formats.
  const generalMatch = trimmed.match(/^(.*\/)([^/]+)(\/[^/]*)$/)
  if (generalMatch) {
    return { prefix: generalMatch[1].replace(/LV\/$/i, ''), seqStr: generalMatch[2], suffix: generalMatch[3] }
  }

  const seq = extractSequenceNumber(trimmed, type)
  const seqStr = seq !== null ? String(seq).padStart(3, '0') : ''

  return {
    prefix: defaultPrefix,
    seqStr: seqStr,
    suffix: defaultSuffix
  }
}
