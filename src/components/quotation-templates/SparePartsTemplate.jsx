import React, { forwardRef } from 'react'
import { formatDate } from '../../util/DateFormat'

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .pdf-page-footer {
    display: none !important;
  }

  thead {
    display: table-header-group !important;
    break-after: avoid !important;
    page-break-after: avoid !important;
  }

  thead tr {
    break-after: avoid !important;
    page-break-after: avoid !important;
  }

  .prose-preview p {
    margin-top: 0 !important;
    margin-bottom: 3px !important;
    line-height: 1.4 !important;
  }

  .prose-preview p:empty,
  .prose-preview p:has(> br:only-child) {
    margin-bottom: 0 !important;
    line-height: 0 !important;
  }

  .prose-preview p:last-child {
    margin-bottom: 0 !important;
  }

  .prose-preview ul {
    list-style-type: disc !important;
    padding-left: 1.25rem !important;
    margin-top: 2px !important;
    margin-bottom: 4px !important;
  }

  .prose-preview ol {
    list-style-type: decimal !important;
    padding-left: 1.25rem !important;
    margin-top: 2px !important;
    margin-bottom: 4px !important;
  }

  .prose-preview li {
    margin-bottom: 2px !important;
  }

  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    thead {
      display: table-header-group !important;
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    thead tr {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
`

const IMAGE_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/quotation-backend/api'
const defaultGetImageUrl = (filename) => {
  if (!filename) return ''
  if (filename.startsWith('data:') || filename.startsWith('blob:') || filename.startsWith('http://') || filename.startsWith('https://')) return filename
  return `${IMAGE_BASE_URL}${filename}`
}

function convertNumberToWords(amount) {
  const num = Math.floor(amount || 0)
  if (num === 0) return "Zero Only"

  const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const double = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  const convertLessThanThousand = (n) => {
    let str = ""
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + " Hundred"
      n %= 100
      if (n > 0) {
        str += " and "
      }
    }
    if (n >= 20) {
      str += double[Math.floor(n / 10)] + " "
      n %= 10
    }
    if (n > 0) {
      str += single[n] + " "
    }
    return str.trim()
  }

  let words = ""
  let rem = num

  if (rem >= 10000000) {
    words += convertLessThanThousand(Math.floor(rem / 10000000)) + " Crore "
    rem %= 10000000;
  }
  if (rem >= 100000) {
    words += convertLessThanThousand(Math.floor(rem / 100000)) + " Lakh "
    rem %= 100000;
  }
  if (rem >= 1000) {
    words += convertLessThanThousand(Math.floor(rem / 1000)) + " Thousand "
    rem %= 1000;
  }
  if (rem > 0) {
    if (words.trim().length > 0 && (rem < 100 || rem % 100 === 0)) {
      words += "and "
    }
    words += convertLessThanThousand(rem)
  }

  return words.trim() + " Only"
}

const SparePartsTemplate = forwardRef(({ formData, companySettings, exchangeRate, getImageUrl: propGetImageUrl }, ref) => {
  const getImageUrl = (url) => {
    if (typeof propGetImageUrl === 'function') {
      return propGetImageUrl(url)
    }
    return defaultGetImageUrl(url)
  }

  const isINR = formData.currency === 'INR'
  const hasClientGst = Boolean(isINR && formData.gstNumber && formData.gstNumber.trim().length > 0)
  const isWithoutGst = formData.gstOption === 'withoutGst'
  const isGstEnabled = hasClientGst && !isWithoutGst && formData.currency !== 'EUR' && (companySettings?.hasGst === true || companySettings?.hasGst === 'yes' || parseFloat(formData.gstPercent || 0) > 0 || parseFloat(formData.gstAmount || 0) > 0)

  const SANS = "'Inter', Arial, sans-serif"

  const tdBase = {
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '9px',
    paddingRight: '9px',
    border: '1px solid #000000',
    fontFamily: SANS,
    fontSize: '9.5pt',
    verticalAlign: 'top',
    color: '#000000',
  }

  const getQuotationNumber = () => {
    return formData.quoteNo || 'QT-001'
  }

  const currSymbol = formData.currency === 'EUR' ? '€' : '₹'
  const currencyLabel = formData.currency === 'EUR' ? 'EUROS' : 'RUPEES'

  const fmtAmt = (n) => {
    if (formData.roundOff) {
      return Math.round(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    }
    return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const getAmountStyle = (val, baseFontSizePt = 9.5, isGrandTotal = false) => {
    const formatted = fmtAmt(val)
    const len = formatted.length + 1

    let fontSize = baseFontSizePt
    let paddingLeft = '9px'
    let paddingRight = '9px'

    if (isGrandTotal) {
      if (len >= 15) {
        fontSize = 8.5
        paddingLeft = '3px'
        paddingRight = '3px'
      } else if (len >= 12) {
        fontSize = 9.5
        paddingLeft = '5px'
        paddingRight = '5px'
      } else if (len >= 10) {
        fontSize = 11
        paddingLeft = '7px'
        paddingRight = '7px'
      }
    } else {
      if (len >= 15) {
        fontSize = 6.5
        paddingLeft = '3px'
        paddingRight = '3px'
      } else if (len >= 12) {
        fontSize = 7.5
        paddingLeft = '5px'
        paddingRight = '5px'
      } else if (len >= 10) {
        fontSize = 8.5
        paddingLeft = '7px'
        paddingRight = '7px'
      }
    }

    return {
      fontSize: `${fontSize}pt`,
      paddingLeft,
      paddingRight
    }
  }

  const activeSectionsList = (formData.sections && formData.sections.length > 0)
    ? formData.sections
    : (Array.isArray(companySettings?.sectionsSpare) && companySettings.sectionsSpare.length > 0
      ? companySettings.sectionsSpare
      : companySettings?.sections || [])

  const defaultSpareIntro = companySettings?.firstPageContentSpare || companySettings?.firstPageContent || ''

  const renderQuotationMeta = () => (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      borderTop: 'none',
      borderBottom: 'none',
      marginBottom: '6px',
      marginTop: companySettings?.pdfHeaderImage ? '8px' : '4px',
    }}>
      <tbody>
        <tr>
          <td style={{ width: '50%', padding: companySettings?.pdfHeaderImage ? '4px 6mm 2px 6mm' : '4px 0 2px 0', fontFamily: SANS, fontSize: '9.5pt', color: '#000000', border: 'none' }}>
            <span>Quotation No: </span>
            <span style={{ fontWeight: '700' }}>{getQuotationNumber()}</span>
          </td>
          <td style={{ width: '50%', padding: companySettings?.pdfHeaderImage ? '4px 6mm 2px 6mm' : '4px 0 2px 0', fontFamily: SANS, fontSize: '9.5pt', color: '#000000', border: 'none', textAlign: 'right' }}>
            <div>
              <span>Quotation Date: </span>
              <span style={{ fontWeight: '700' }}>{formatDate(formData.date, 'N/A')}</span>
            </div>
            {hasClientGst && companySettings?.gstNumber && companySettings?.pdfHeaderImage && (
              <div style={{ marginTop: '2px', fontWeight: '700' }}>
                GSTIN: {companySettings.gstNumber}
              </div>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );

  const renderHeader = () => {
    return (
      <div style={{ padding: companySettings?.pdfHeaderImage ? '0mm' : '6mm 6mm 0mm', borderBottom: 'none' }}>
        {companySettings?.pdfHeaderImage ? (
          <>
            <img
              src={getImageUrl(companySettings.pdfHeaderImage)}
              alt="Header"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            {renderQuotationMeta()}
          </>
        ) : (
          <div>
            {renderQuotationMeta()}
            <div style={{ marginBottom: '6px' }}>
              <span style={{
                fontFamily: SANS,
                fontSize: '9.5pt',
                fontWeight: '700',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#000000',
              }}>
                quotation
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginBottom: '6px' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top', padding: 0, border: 'none' }}>
                    <div style={{
                      fontFamily: SANS,
                      fontSize: '20pt',
                      fontWeight: '800',
                      color: '#000000',
                      lineHeight: '1.1',
                    }}>
                      {companySettings?.companyName || 'YOUR COMPANY NAME'}
                    </div>
                    {companySettings?.address && (
                      <div style={{ fontSize: '9pt', color: '#333333', marginTop: '3px', whiteSpace: 'pre-line' }}>
                        {companySettings.address}
                        {(companySettings.city || companySettings.state || companySettings.pincode) && (
                          <div>{[companySettings.city, companySettings.state, companySettings.pincode].filter(Boolean).join(', ')}</div>
                        )}
                        {hasClientGst && companySettings?.gstNumber && (
                          <div style={{ fontWeight: '700', color: '#000000', marginTop: '2px' }}>
                            GSTIN : {companySettings.gstNumber}
                          </div>
                        )}
                      </div>
                    )}
                    {(!companySettings?.address && hasClientGst && companySettings?.gstNumber) && (
                      <div style={{ fontSize: '9pt', fontWeight: '700', color: '#000000', marginTop: '3px' }}>
                        GSTIN : {companySettings.gstNumber}
                      </div>
                    )}
                  </td>
                  <td style={{
                    verticalAlign: 'top',
                    textAlign: 'right',
                    padding: 0,
                    border: 'none',
                    width: '150px',
                  }}>
                    {companySettings?.companyLogo || companySettings?.logo ? (
                      <img
                        src={getImageUrl(companySettings.companyLogo || companySettings.logo)}
                        alt="Brand"
                        style={{
                          maxHeight: '56px',
                          maxWidth: '140px',
                          objectFit: 'contain',
                          display: 'inline-block',
                        }}
                      />
                    ) : (
                      <div style={{ fontFamily: SANS, fontSize: '22pt', fontWeight: '800', color: '#000000' }}>
                        {companySettings?.companyName || 'COMPANY'}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        padding: '0mm',
        fontFamily: SANS,
        fontSize: '9.5pt',
        lineHeight: '1.45',
        color: '#000000',
        position: 'relative'
      }}
    >
      <style>{FONTS}</style>

      {/* ── HEADER SECTION ── */}
      {renderHeader()}

      {/* ── BODY SECTION WITH 6mm PADDING (CurrentClassicTemplate Standard) ── */}
      <div style={{ padding: '0 6mm 6mm' }}>

        {/* ── CUSTOMER ADDRESS BLOCK ── */}
        <div style={{
          fontFamily: SANS,
          fontSize: '9.5pt',
          color: '#000000',
          lineHeight: '1.55',
          marginTop: '8px',
          marginBottom: '14px',
        }}>
          <div>To</div>
          {formData.companyName && (
            <div style={{ fontWeight: '700' }}>
              {formData.companyName.toLowerCase().startsWith('m/s') ? formData.companyName : `M/s ${formData.companyName}`}
            </div>
          )}
          {formData.address && <div style={{ whiteSpace: 'pre-line' }}>{formData.address}</div>}
          {hasClientGst && (
            <div style={{ fontWeight: '700' }}>GSTIN : {formData.gstNumber.trim()}</div>
          )}
          {formData.customerMobile && (
            <div>mobile : {formData.customerMobile}</div>
          )}
          {formData.customerEmail && (
            <div>
              Email id: <a href={`mailto:${formData.customerEmail}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>{formData.customerEmail}</a>
            </div>
          )}

          {formData.customerName && (
            <div style={{ marginTop: '10px', fontWeight: '700' }}>
              Kind Attn : {formData.customerName}
            </div>
          )}
        </div>

        {/* ── SUBJECT & INTRO CONTENT ── */}
        <div style={{ marginBottom: '14px', fontSize: '9.5pt', lineHeight: '1.5', color: '#000000', fontFamily: SANS }}>
          {formData.subject && (
            <p style={{ margin: '0 0 8px 0', fontWeight: '800' }}>
              Sub: {formData.subject}
            </p>
          )}

          {formData.introContent ? (
            <div
              className="prose-preview"
              style={{ fontSize: '9.5pt', lineHeight: '1.5', color: '#000000' }}
              dangerouslySetInnerHTML={{ __html: formData.introContent }}
            />
          ) : defaultSpareIntro ? (
            <div
              className="prose-preview"
              style={{ fontSize: '9.5pt', lineHeight: '1.5', color: '#000000' }}
              dangerouslySetInnerHTML={{ __html: defaultSpareIntro }}
            />
          ) : (
            <p style={{ margin: 0 }}>
              We thank you very much for your valuable email enquiry dt. {formatDate(formData.date)}. On behalf of M/s. EHP Germany, may we submit our offer as under:
            </p>
          )}
        </div>

        {/* ── LINE ITEMS TABLE (SUMMARY INTEGRATED EXACTLY LIKE CurrentClassicTemplate) ── */}
        <div style={{ marginBottom: '16px' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1.5px solid #000000',
              fontFamily: SANS,
              fontSize: '9.5pt',
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col style={{ width: '36px' }} />
              <col style={{ width: 'auto' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '36px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '105px' }} />
              <col style={{ width: '85px' }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: '#ffffff', borderBottom: '1.5px solid #000000' }}>
                <th style={{ ...tdBase, textAlign: 'center', fontWeight: '700', paddingLeft: '2px', paddingRight: '2px' }}>
                  Sl. No.
                </th>
                <th style={{ ...tdBase, textAlign: 'left', fontWeight: '700' }}>
                  DESCRIPTION
                </th>
                <th style={{ ...tdBase, textAlign: 'center', fontWeight: '700', paddingLeft: '3px', paddingRight: '3px' }}>
                  ART NO
                </th>
                <th style={{ ...tdBase, textAlign: 'center', fontWeight: '700', paddingLeft: '2px', paddingRight: '2px' }}>
                  QTY
                </th>
                <th style={{ ...tdBase, textAlign: 'right', fontWeight: '700' }}>
                  UNIT PRICE IN {currencyLabel}
                </th>
                <th style={{ ...tdBase, textAlign: 'right', fontWeight: '700' }}>
                  TOTAL PRICE IN {currencyLabel}
                </th>
                <th style={{ ...tdBase, textAlign: 'center', fontWeight: '700', paddingLeft: '3px', paddingRight: '3px', whiteSpace: 'nowrap' }}>
                  HSN CODE
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                if (!formData.items || formData.items.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} style={{ ...tdBase, textAlign: 'center', fontStyle: 'italic' }}>
                        [No spare part items added yet]
                      </td>
                    </tr>
                  )
                }

                const rows = []

                formData.items.forEach((item, idx) => {
                  const qty = parseInt(item.qty || 1)
                  const unitRate = parseFloat(item.price || item.basePrice || 0)
                  const lineTotal = qty * unitRate
                  const artNo = item.partNo || item.artNo || item.modelNo || item.productCode || '-'
                  const hsnCode = item.hsnCode || item.hsn || '-'
                  const itemImg = item.image || item.img || item.productImage

                  rows.push(
                    <tr key={`item-${idx}`} style={{ borderBottom: '1px solid #000000' }}>
                      <td style={{ ...tdBase, textAlign: 'center', fontWeight: '500', paddingLeft: '2px', paddingRight: '2px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ ...tdBase, wordBreak: 'break-word' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          {formData.showProductImages !== false && itemImg && (
                            <div style={{
                              width: '45px',
                              height: '45px',
                              borderRadius: '3px',
                              border: '1px solid #e2e8f0',
                              overflow: 'hidden',
                              backgroundColor: '#f8fafc',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <img
                                src={getImageUrl(itemImg)}
                                alt={item.productName || item.desc || ''}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '700', color: '#000000', fontSize: '9.5pt', whiteSpace: 'pre-line' }}>{item.productName || item.desc}</div>
                            {item.productDesc && (
                              <div style={{ fontSize: '9.5pt', color: '#333333', marginTop: '3px', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                                {item.productDesc}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdBase, textAlign: 'center', fontWeight: '600', paddingLeft: '3px', paddingRight: '3px', wordBreak: 'break-all' }}>
                        {artNo}
                      </td>
                      <td style={{ ...tdBase, textAlign: 'center', fontWeight: '700', paddingLeft: '2px', paddingRight: '2px' }}>
                        {qty}
                      </td>
                      <td style={{ ...tdBase, ...getAmountStyle(unitRate), textAlign: 'right', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                        {currSymbol} {fmtAmt(unitRate)}
                      </td>
                      <td style={{ ...tdBase, ...getAmountStyle(lineTotal), textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                        {currSymbol} {fmtAmt(lineTotal)}
                      </td>
                      <td style={{ ...tdBase, textAlign: 'center', fontWeight: '600', paddingLeft: '3px', paddingRight: '3px', fontSize: '9pt', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {hsnCode}
                      </td>
                    </tr>
                  )
                })

                // Financial Summary Rows integrated at table bottom (CurrentClassicTemplate pattern)
                if (isGstEnabled) {
                  rows.push(
                    <tr key="taxable-summary-row">
                      <td colSpan={4} style={{ ...tdBase, border: 'none' }} />
                      <td colSpan={2} style={{ ...tdBase, textAlign: 'right', fontWeight: '700' }}>Taxable Amount</td>
                      <td style={{ ...tdBase, ...getAmountStyle(formData.taxableAmount), textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums', paddingLeft: '4px', paddingRight: '4px' }}>{currSymbol}{fmtAmt(formData.taxableAmount)}</td>
                    </tr>
                  )
                  rows.push(
                    <tr key="gst-summary-row">
                      <td colSpan={4} style={{ ...tdBase, border: 'none' }} />
                      <td colSpan={2} style={{ ...tdBase, textAlign: 'right', fontWeight: '700' }}>
                        GST ({formData.gstPercent !== undefined && formData.gstPercent !== '' ? formData.gstPercent : 18}%)
                      </td>
                      <td style={{ ...tdBase, ...getAmountStyle(formData.gstAmount), textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums', paddingLeft: '4px', paddingRight: '4px' }}>
                        {currSymbol}{fmtAmt(formData.gstAmount)}
                      </td>
                    </tr>
                  )
                }

                if (parseFloat(formData.discountAmount || 0) > 0) {
                  rows.push(
                    <tr key="discount-summary-row">
                      <td colSpan={4} style={{ ...tdBase, border: 'none' }} />
                      <td colSpan={2} style={{ ...tdBase, textAlign: 'right', fontWeight: '700' }}>
                        Discount ({formData.discountPercent}%)
                      </td>
                      <td style={{ ...tdBase, ...getAmountStyle(formData.discountAmount), textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums', paddingLeft: '4px', paddingRight: '4px' }}>
                        -{currSymbol}{fmtAmt(formData.discountAmount)}
                      </td>
                    </tr>
                  )
                }

                rows.push(
                  <tr key="total-summary-row" style={{ borderTop: '1px solid #000000' }}>
                    <td colSpan={4} style={{ ...tdBase, border: 'none', fontSize: '9.5pt' }}>
                      Total Items: {formData.items ? formData.items.length : 0}
                    </td>
                    <td colSpan={2} style={{ ...tdBase, ...getAmountStyle(formData.grandTotal, 9.5, true), border: '1.5px solid #000000', textAlign: 'right', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      Total
                    </td>
                    <td style={{ ...tdBase, ...getAmountStyle(formData.grandTotal, 9.5, true), border: '1.5px solid #000000', textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', paddingLeft: '4px', paddingRight: '4px' }}>
                      {currSymbol}{fmtAmt(formData.grandTotal)}
                    </td>
                  </tr>
                )

                rows.push(
                  <tr key="payable-summary-row">
                    <td colSpan={7} style={{ ...tdBase, border: '1.5px solid #000000', textAlign: 'right', padding: '8px 10px' }}>
                      <span style={{ fontSize: '9.5pt', fontWeight: '700' }}>Amount Payable: </span>
                      <span style={{ fontWeight: '800', fontSize: '9.5pt', fontVariantNumeric: 'tabular-nums', marginLeft: '2px' }}>
                        {currSymbol}{fmtAmt(formData.grandTotal)}
                      </span>
                      <span style={{ fontSize: '9.5pt', color: '#475569', fontStyle: 'italic', marginLeft: '6px' }}>
                        ({formData.amountInWords || convertNumberToWords(formData.grandTotal)})
                      </span>
                    </td>
                  </tr>
                )

                return rows
              })()}
            </tbody>
          </table>
        </div>

        {/* ── CUSTOM SECTIONS / TERMS ── */}
        {activeSectionsList && activeSectionsList.length > 0 && (
          <div style={{ marginTop: '16px', fontFamily: SANS, color: '#000000' }}>
            {[...activeSectionsList]
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .filter(sec => sec.isActive !== false)
              .map((sec, idx) => (
                <div key={sec._id || sec.tempId || idx} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'inline-block', fontWeight: '800', fontSize: '9.5pt', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px dashed #000000', paddingBottom: '2px', marginBottom: '4px' }}>
                    {sec.title}
                  </div>
                  {sec.content && sec.content.startsWith('<') ? (
                    <div className="prose-preview" style={{ fontSize: '9.5pt', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: sec.content }} />
                  ) : (
                    <div style={{ fontSize: '9.5pt', lineHeight: '1.4', whiteSpace: 'pre-line' }}>{sec.content}</div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ── BANK DETAILS + SIGNATURE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '16px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', padding: 0, border: 'none' }}>
                <table style={{ borderCollapse: 'collapse', border: 'none' }}>
                  <tbody>
                    <tr>
                      {formData?.showBankDetails !== false && (
                        ((formData?.country === 'Europe' || formData?.currency === 'EUR')
                          ? (formData?.bankDetails?.qrCodeEurope || companySettings?.bankDetails?.qrCodeEurope)
                          : (formData?.bankDetails?.qrCodeIndia || companySettings?.bankDetails?.qrCodeIndia))
                      ) && (
                        <td style={{ verticalAlign: 'top', paddingRight: '14px', border: 'none' }}>
                          <div style={{ fontSize: '9.5pt', fontWeight: '700', marginBottom: '4px' }}>Pay using QR:</div>
                          <img
                            src={getImageUrl(
                              (formData?.country === 'Europe' || formData?.currency === 'EUR')
                                ? (formData?.bankDetails?.qrCodeEurope || companySettings?.bankDetails?.qrCodeEurope)
                                : (formData?.bankDetails?.qrCodeIndia || companySettings?.bankDetails?.qrCodeIndia)
                            )}
                            alt="Bank QR"
                            style={{ width: '100px', height: '100px', objectFit: 'contain', display: 'block' }}
                          />
                        </td>
                      )}
                      {formData?.showBankDetails !== false && (
                        <td style={{ verticalAlign: 'top', border: 'none' }}>
                          <div style={{ fontSize: '9.5pt', fontWeight: '700', marginBottom: '4px' }}>Bank Details:</div>
                          {(formData?.country === 'Europe' || formData?.currency === 'EUR') ? (
                            <div
                              className="prose prose-sm max-w-none text-slate-800"
                              style={{ fontSize: '9.5pt', lineHeight: '1.4' }}
                              dangerouslySetInnerHTML={{ __html: formData?.bankDetails?.bankContentEurope || companySettings?.bankDetails?.bankContentEurope || '' }}
                            />
                          ) : (
                            <div
                              className="prose prose-sm max-w-none text-slate-800"
                              style={{ fontSize: '9.5pt', lineHeight: '1.4' }}
                              dangerouslySetInnerHTML={{ __html: formData?.bankDetails?.bankContentIndia || companySettings?.bankDetails?.bankContentIndia || '' }}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </td>

              <td style={{ verticalAlign: 'top', textAlign: 'right', padding: 0, border: 'none', width: '180px' }}>
                <div style={{ height: '58px', width: '120px', marginLeft: 'auto', position: 'relative' }}>
                  {(() => {
                    const sealVal = companySettings?.companySeal || companySettings?.sealImage || companySettings?.seal || formData?.companySeal || formData?.sealImage || formData?.seal
                    const signVal = companySettings?.authSignatoryImage || companySettings?.signatureImage || companySettings?.signature || formData?.authSignatoryImage || formData?.signatureImage || formData?.signature
                    return (
                      <>
                        {signVal && (
                          <img
                            src={getImageUrl(signVal)}
                            alt="Signature"
                            style={{
                              maxHeight: '54px',
                              maxWidth: '120px',
                              objectFit: 'contain',
                              position: 'relative',
                              zIndex: 1,
                              mixBlendMode: 'multiply',
                              display: 'block',
                              margin: '0 0 0 auto',
                            }}
                          />
                        )}
                        {sealVal && (
                          <img
                            src={getImageUrl(sealVal)}
                            alt="Seal"
                            style={{
                              maxHeight: '54px',
                              maxWidth: '120px',
                              objectFit: 'contain',
                              opacity: 0.9,
                              position: signVal ? 'absolute' : 'relative',
                              right: signVal ? '0' : 'auto',
                              top: signVal ? '0' : 'auto',
                              zIndex: 10,
                              display: 'block',
                              margin: '0 0 0 auto',
                              pointerEvents: 'none',
                            }}
                          />
                        )}
                      </>
                    )
                  })()}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
})

export default SparePartsTemplate
