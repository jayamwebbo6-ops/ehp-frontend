/**
 * Quotation Number Generator & Helper Utilities
 * 
 * Rules:
 * 1. Spares Quotation Format: EHPINDIA/TSV/VV/LV/{SEQ}/SPARES (Starts at 026)
 * 2. Scales Quotation Format: EHPINDIA/TSV/VV/LV/{SEQ}/AAA (Starts at 044)
 * 3. Sequence Strategy: Lowest missing / available sequence number starting from base
 *    (Allows reusing sequence numbers after deletion, while preventing duplicates if present).
 */

export const SCALE_PREFIX = 'EHPINDIA/TSV/VV/LV/'
export const SCALE_SUFFIX = '/AAA'

export const SPARE_PREFIX = 'EHPINDIA/TSV/VV/LV/'
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

  if (isSpareType) {
    // Match .../064/SPARES or .../026/SPARES
    const match = trimmed.match(/\/(\d+)\/SPARES/i)
    if (match) return parseInt(match[1], 10)
  } else {
    // Match .../044/AAA or .../047/AAA
    const match = trimmed.match(/\/(\d+)\/AAA/i)
    if (match) return parseInt(match[1], 10)
  }

  // General slash extraction fallback: EHPINDIA/TSV/VV/LV/{seq}/...
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
 * Formats quotation number for display / PDF with version.
 * @param {string} quoteNo 
 * @param {number|string} [version=1] 
 * @returns {string}
 */
export const formatQuotationDisplay = (quoteNo, version = 1) => {
  if (!quoteNo) return ''
  const ver = typeof version === 'number' ? `V${version}` : (version || 'V1')
  return `${quoteNo} ${ver}`
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

  // Match: (prefix)/{digits}/(suffix)
  if (isSpareType) {
    const match = trimmed.match(/^(.*\/)(\d+)(\/SPARES)$/i)
    if (match) {
      return { prefix: match[1], seqStr: match[2], suffix: match[3].toUpperCase() }
    }
  } else {
    const match = trimmed.match(/^(.*\/)(\d+)(\/AAA)$/i)
    if (match) {
      return { prefix: match[1], seqStr: match[2], suffix: match[3].toUpperCase() }
    }
  }

  // Fallback pattern: anything ending with digits before slash or end
  const generalMatch = trimmed.match(/^(.*\/)(\d+)(\/[^\/]*)$/)
  if (generalMatch) {
    return { prefix: generalMatch[1], seqStr: generalMatch[2], suffix: generalMatch[3] }
  }

  const seq = extractSequenceNumber(trimmed, type)
  const seqStr = seq !== null ? String(seq).padStart(3, '0') : ''

  return {
    prefix: defaultPrefix,
    seqStr: seqStr,
    suffix: defaultSuffix
  }
}

