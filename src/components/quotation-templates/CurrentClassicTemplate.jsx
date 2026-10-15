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

const CurrentClassicTemplate = forwardRef(function CurrentClassicTemplate(
  { formData, companySettings, getImageUrl, isStateMatching },
  ref
) {
  const isWithoutGst = formData.gstOption === 'withoutGst';
  const isGstEnabled = !isWithoutGst && formData.currency !== 'EUR' && (companySettings?.hasGst === true || companySettings?.hasGst === 'yes');

  const getIgstRate = () => {
    if (formData.igstPercent !== undefined && formData.igstPercent !== 0) return formData.igstPercent
    const t = formData.taxableAmount || 0
    if (formData.igstAmount > 0 && t > 0) return (formData.igstAmount / t) * 100
    return formData.gstPercent || 0
  }
  const getCgstRate = () => {
    if (formData.cgstPercent !== undefined && formData.cgstPercent !== 0) return formData.cgstPercent
    const t = formData.taxableAmount || 0
    if (formData.cgstAmount > 0 && t > 0) return (formData.cgstAmount / t) * 100
    return (formData.gstPercent || 0) / 2
  }
  const getSgstRate = () => {
    if (formData.sgstPercent !== undefined && formData.sgstPercent !== 0) return formData.sgstPercent
    const t = formData.taxableAmount || 0
    if (formData.sgstAmount > 0 && t > 0) return (formData.sgstAmount / t) * 100
    return (formData.gstPercent || 0) / 2
  }

  const currSymbol = formData.currency === 'EUR' ? '€' : '₹'

  const fmt = (n) => {
    if (formData.roundOff) {
      return Math.round(Number(n || 0)).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    }
    return Number(n || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const getAmountStyle = (val, baseFontSizePt = 9.5, isGrandTotal = false) => {
    const formatted = fmt(val)
    const len = formatted.length + 1 // Add 1 for ₹ or negative sign

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

  const totalRows = (formData.items || []).reduce((acc, item) => {
    let count = 1
    if (Array.isArray(item.selectedAccessories)) count += item.selectedAccessories.length
    if (Array.isArray(item.selectedOptionals)) count += item.selectedOptionals.length
    return acc + count
  }, 0)
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
    const baseNumber = formData.quoteNo || 'INV-001'
    const version = formData.version || 1
    return `${baseNumber} V${version}`
  }

  const hasFirstPageCover = companySettings?.showFirstPageContent && companySettings?.firstPageContent;

  // ── Quotation No / Quotation Date strip ──
  // Rendered immediately below the header, before anything else (including
  // the "quotation" label line and the company details block), matching the
  // reference layout: ref number top-left, date top-right.
  const renderQuotationMeta = () => (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      borderTop: 'none',
      borderBottom: 'none',
      marginBottom: '6px',
      marginTop: '20px',
    }}>
      <tbody>
        <tr>
          <td style={{ width: '50%', padding: companySettings?.pdfHeaderImage ? '4px 6mm 2px 6mm' : '4px 0 2px 0', fontFamily: SANS, fontSize: '9.5pt', color: '#000000', border: 'none' }}>
            <span>Quotation No: </span>
            <span style={{ fontWeight: '700' }}>{getQuotationNumber()}</span>
          </td>
          <td style={{ width: '50%', padding: companySettings?.pdfHeaderImage ? '4px 6mm 2px 6mm' : '4px 0 2px 0', fontFamily: SANS, fontSize: '9.5pt', color: '#000000', border: 'none', textAlign: 'right' }}>
            <span>Quotation Date: </span>
            <span style={{ fontWeight: '700' }}>{formatDate(formData.date, 'N/A')}</span>
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
                  </td>
                  <td style={{
                    verticalAlign: 'top',
                    textAlign: 'right',
                    padding: 0,
                    border: 'none',
                    width: '150px',
                  }}>
                    {companySettings?.companyLogo ? (
                      <img
                        src={getImageUrl(companySettings.companyLogo)}
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
      className="w-full max-w-[210mm] bg-white text-black"
      style={{
        boxSizing: 'border-box',
        fontFamily: SANS,
        fontSize: '9.5pt',
        lineHeight: '1.45',
        padding: '0mm',
        position: 'relative',
      }}
    >
      <style>{FONTS}</style>

      {/* ── First page footer image ── */}
      {companySettings?.pdfFooterImage && (
        <div className="pdf-footer-image" style={{
          position: 'absolute',
          top: '280mm',
          transform: 'translateY(-100%)',
          left: '6mm',
          right: '6mm',
          height: 'auto',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          <img
            src={getImageUrl(companySettings.pdfFooterImage)}
            alt="Footer"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      )}

      {/* ── Outer wrapper div ── */}
      <div style={{ width: '100%', position: 'relative' }}>

        {/* ══ HEADER SECTION ══ */}
        {renderHeader()}

        {/* ══ BODY SECTION ══ */}
        <div style={{ padding: '0 6mm 6mm' }}>

          {/* ── Customer Details (To / M/s / Kind Attn) ── */}
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
            {/* {formData.state && <div>{formData.state}{formData.pincode ? `, ${formData.pincode}` : ''}</div>} */}
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

          {/* ── Intro Content (if provided or enabled) ── */}
          {(formData.introContent || (hasFirstPageCover && companySettings?.firstPageContent)) && (
            <div style={{ marginBottom: '12px' }}>
              <div
                className="prose-preview"
                style={{
                  marginTop: '4px',
                  fontSize: '9.5pt',
                  lineHeight: '1.5',
                  color: '#000000'
                }}
                dangerouslySetInnerHTML={{ __html: formData.introContent || companySettings?.firstPageContent || '' }}
              />
            </div>
          )}

          {/* ── REQUIREMENTS SECTION (Rendered directly after Intro Content) ── */}
          {formData.requirementsOption !== false && Array.isArray(formData.requirements) && formData.requirements.filter(req => req && req.value && req.value.trim() !== '').length > 0 && (
            <div style={{ marginTop: '6px', marginBottom: '14px', color: '#000000', fontFamily: SANS }}>
              <div style={{ fontWeight: '600', fontSize: '9.5pt', marginBottom: '6px', color: '#000000' }}>
                We understand your application is as under:
              </div>
              <div style={{ fontSize: '9.5pt', lineHeight: '1.6', color: '#000000' }}>
                {formData.requirements.filter(req => req && req.value && req.value.trim() !== '').map((req, rIdx) => (
                  <div key={rIdx} style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: '600', minWidth: '22px' }}>{rIdx + 1}.</span>
                    <span style={{ fontWeight: '600', textTransform: 'uppercase' }}>{req.title}</span>
                    <span style={{ fontWeight: '600', marginLeft: '4px', marginRight: '6px' }}>:</span>
                    <span>{req.value || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Subject ── */}
          {/* {formData.subject && (
            <div style={{ fontFamily: SANS, fontSize: '9.5pt', marginBottom: '8px', color: '#000000' }}>
              <strong>Subject: </strong>{formData.subject}
            </div>
          )} */}

          {/* ── ITEMS TABLE ── */}
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1.5px solid #000000',
            tableLayout: 'fixed',
          }}>
            <colgroup>
              <col style={{ width: '50px' }} />
              <col style={{ width: 'auto' }} />
              <col style={{ width: isGstEnabled ? '95px' : '100px' }} />
              <col style={{ width: isGstEnabled ? '50px' : '50px' }} />
              {isGstEnabled && <col style={{ width: '105px' }} />}
              <col style={{ width: isGstEnabled ? '105px' : '110px' }} />
            </colgroup>
            <thead>
              <tr style={{ background: 'transparent', borderBottom: '1.5px solid #000000' }}>
                {[
                  { label: 'S.NO.', align: 'center', show: true },
                  { label: 'Description', align: 'left', show: true },
                  { label: 'Rate/Item', align: 'right', show: true },
                  { label: 'Qty', align: 'center', show: true },
                  { label: 'Taxable Value', align: 'right', show: isGstEnabled },
                  { label: 'Amount', align: 'right', show: true },
                ].filter(col => col.show).map(({ label, align }) => (
                  <th key={label} style={{
                    ...tdBase,
                    textAlign: align,
                    fontWeight: '700',
                    background: 'transparent',
                    verticalAlign: 'middle',
                  }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                if (!formData.items || formData.items.length === 0) {
                  return (
                    <tr>
                      <td colSpan={isGstEnabled ? 6 : 5} style={{ ...tdBase, textAlign: 'center', fontStyle: 'italic' }}>
                        [No items added yet]
                      </td>
                    </tr>
                  )
                }

                let runningSNo = 1
                const rows = []

                formData.items.forEach((item, itemIdx) => {
                  const selectedAccs = Array.isArray(item.selectedAccessories) ? item.selectedAccessories : []
                  const selectedOpts = Array.isArray(item.selectedOptionals) ? item.selectedOptionals : []

                  const accTotal = selectedAccs.reduce((sum, a) => sum + (parseFloat(a.price || 0)), 0)
                  const optTotal = selectedOpts.reduce((sum, o) => sum + (parseFloat(o.price || 0)), 0)

                  let baseRate = parseFloat(item.basePrice !== undefined && item.basePrice !== '' ? item.basePrice : item.price || 0)
                  if (item.basePrice === undefined || item.basePrice === '') {
                    if (selectedAccs.length > 0 || selectedOpts.length > 0) {
                      baseRate = Math.max(0, parseFloat(item.price || 0) - accTotal - optTotal)
                    }
                  }

                  const qty = parseFloat(item.qty || 1)
                  const gstRate = item.gstPercent !== undefined && item.gstPercent !== ''
                    ? parseFloat(item.gstPercent)
                    : parseFloat(formData.gstPercent || 0)

                  const renderItemRow = (rowKey, sNo, name, desc, hsn, img, techData, rateVal, webUrl, ytUrl) => {
                    const sub = rateVal * qty
                    const disc = sub * (parseFloat(formData.discountPercent || 0) / 100)
                    const taxable = sub - disc
                    const taxAmt = taxable * (gstRate / 100)
                    const total = taxable + taxAmt

                    return (
                      <tr key={rowKey} style={{ borderBottom: '1px solid #000000' }}>
                        <td style={{ ...tdBase, textAlign: 'center', fontWeight: '500' }}>{sNo}</td>
                        <td style={{ ...tdBase, wordBreak: 'break-word' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            {formData.showProductImages !== false && img && (
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
                                  src={getImageUrl(img)}
                                  alt={name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '700', fontSize: '9.5pt', color: '#000000', marginBottom: '2px' }}>
                                {name}
                              </div>
                              {desc && (
                                <div style={{ fontSize: '9.5pt', color: '#000000', marginTop: '3px', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                                  {desc}
                                </div>
                              )}
                              {Array.isArray(techData) && techData.length > 0 && (
                                <div style={{ fontSize: '9.5pt', color: '#000000', marginTop: '4px' }}>
                                  <strong style={{ color: '#000000' }}>Technical Data:</strong>
                                  <ul style={{ margin: '2px 0 0 14px', padding: 0, listStyleType: 'disc' }}>
                                    {techData.map((t, tIdx) => (
                                      (t.name || t.value) && (
                                        <li key={tIdx}>
                                          {t.name}{t.name && t.value ? ': ' : ''}{t.value}
                                        </li>
                                      )
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {webUrl && (
                                <div style={{ fontSize: '9.5pt', color: '#000000', marginTop: '3px', wordBreak: 'break-all' }}>
                                  <strong>Link : </strong>
                                  <a href={webUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                                    {webUrl}
                                  </a>
                                </div>
                              )}
                              {ytUrl && (
                                <div style={{ fontSize: '9.5pt', color: '#000000', marginTop: '2px', wordBreak: 'break-all' }}>
                                  <strong>You Tube Link : </strong>
                                  <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                                    {ytUrl}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ ...tdBase, ...getAmountStyle(rateVal), textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(rateVal)}
                        </td>
                        <td style={{ ...tdBase, textAlign: 'center' }}>{qty}</td>
                        {isGstEnabled && (
                          <td style={{ ...tdBase, ...getAmountStyle(taxable), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(taxable)}
                          </td>
                        )}
                        <td style={{ ...tdBase, ...getAmountStyle(taxable), textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(taxable)}
                        </td>
                      </tr>
                    )
                  }

                  // Main Product Row
                  rows.push(
                    renderItemRow(
                      `prod-${itemIdx}`,
                      runningSNo++,
                      item.productName,
                      item.productDesc,
                      item.hsnCode,
                      item.image,
                      item.technicalData,
                      baseRate,
                      item.websiteUrl || item.websiteLink,
                      item.youtubeUrl || item.youtubeLink
                    )
                  )

                  // ACCESSORIES Section Header & Rows
                  if (selectedAccs.length > 0) {
                    rows.push(
                      <tr key={`acc-header-${itemIdx}`} style={{ borderBottom: '1.5px solid #000000', backgroundColor: '#fff5f5' }}>
                        <td
                          colSpan={isGstEnabled ? 6 : 5}
                          style={{
                            ...tdBase,
                            color: '#dc2626',
                            fontWeight: '800',
                            fontSize: '9.5pt',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            textDecoration: 'underline',
                            paddingTop: '5px',
                            paddingBottom: '5px',
                            backgroundColor: '#fff5f5',
                          }}
                        >
                          ACCESSORIES
                        </td>
                      </tr>
                    )

                    selectedAccs.forEach((acc, aIdx) => {
                      const accPrice = parseFloat(acc.price || 0)
                      rows.push(
                        renderItemRow(
                          `acc-${itemIdx}-${aIdx}`,
                          runningSNo++,
                          acc.name,
                          acc.description,
                          null,
                          acc.image,
                          null,
                          accPrice,
                          acc.websiteUrl || acc.websiteLink,
                          acc.youtubeUrl || acc.youtubeLink
                        )
                      )
                    })
                  }

                  // OPTIONALS Section Header & Rows
                  if (selectedOpts.length > 0) {
                    rows.push(
                      <tr key={`opt-header-${itemIdx}`} style={{ borderBottom: '1.5px solid #000000', backgroundColor: '#fff5f5' }}>
                        <td
                          colSpan={isGstEnabled ? 6 : 5}
                          style={{
                            ...tdBase,
                            color: '#dc2626',
                            fontWeight: '800',
                            fontSize: '9.5pt',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            textDecoration: 'underline',
                            paddingTop: '5px',
                            paddingBottom: '5px',
                            backgroundColor: '#fff5f5',
                          }}
                        >
                          OPTIONALS
                        </td>
                      </tr>
                    )

                    selectedOpts.forEach((opt, oIdx) => {
                      const optPrice = parseFloat(opt.price || 0)
                      rows.push(
                        renderItemRow(
                          `opt-${itemIdx}-${oIdx}`,
                          runningSNo++,
                          opt.name,
                          opt.description,
                          null,
                          opt.image,
                          null,
                          optPrice,
                          opt.websiteUrl || opt.websiteLink,
                          opt.youtubeUrl || opt.youtubeLink
                        )
                      )
                    })
                  }
                })

                if (isGstEnabled) {
                  rows.push(
                    <tr key="taxable-summary-row">
                      <td colSpan={3} style={{ ...tdBase, border: 'none' }} />
                      <td colSpan={2} style={{ ...tdBase, textAlign: 'right', fontWeight: '600' }}>Taxable Amount</td>
                      <td style={{ ...tdBase, ...getAmountStyle(formData.taxableAmount), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{currSymbol}{fmt(formData.taxableAmount)}</td>
                    </tr>
                  )
                  rows.push(
                    <tr key="gst-summary-row">
                      <td colSpan={3} style={{ ...tdBase, border: 'none' }} />
                      <td colSpan={2} style={{ ...tdBase, textAlign: 'right', fontWeight: '600' }}>
                        GST ({formData.gstPercent !== undefined && formData.gstPercent !== '' ? formData.gstPercent : (formData.items && formData.items[0]?.gstPercent ? formData.items[0].gstPercent : 18)}%)
                      </td>
                      <td style={{ ...tdBase, ...getAmountStyle(formData.gstAmount || (formData.taxableAmount * (((formData.gstPercent !== undefined && formData.gstPercent !== '' ? formData.gstPercent : 18)) / 100))), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {currSymbol}{fmt(formData.gstAmount || (formData.taxableAmount * (((formData.gstPercent !== undefined && formData.gstPercent !== '' ? formData.gstPercent : 18)) / 100)))}
                      </td>
                    </tr>
                  )
                }

                if (formData.discountAmount > 0) {
                  rows.push(
                    <tr key="discount-summary-row">
                      <td colSpan={isGstEnabled ? 3 : 2} style={{ ...tdBase, border: 'none' }} />
                      <td colSpan={2} style={{ ...tdBase, textAlign: 'right', fontWeight: '600' }}>
                        Discount ({formData.discountPercent}%)
                      </td>
                      <td style={{ ...tdBase, ...getAmountStyle(formData.discountAmount), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        -{currSymbol}{fmt(formData.discountAmount)}
                      </td>
                    </tr>
                  )
                }

                rows.push(
                  <tr key="total-summary-row" style={{ borderTop: '1px solid #000000' }}>
                    <td colSpan={isGstEnabled ? 3 : 2} style={{ ...tdBase, border: 'none', fontSize: '9.5pt' }}>
                      Total Items / Qty : {totalRows}
                    </td>
                    <td colSpan={2} style={{ ...tdBase, ...getAmountStyle(formData.grandTotal, 9.5, true), border: '1.5px solid #000000', textAlign: 'right', fontWeight: '700', whiteSpace: 'nowrap' }}>
                      Total
                    </td>
                    <td style={{ ...tdBase, ...getAmountStyle(formData.grandTotal, 9.5, true), border: '1.5px solid #000000', textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {currSymbol}{fmt(formData.grandTotal)}
                    </td>
                  </tr>
                )

                rows.push(
                  <tr key="payable-summary-row">
                    <td colSpan={isGstEnabled ? 6 : 5} style={{ ...tdBase, border: '1px solid #000000', textAlign: 'right', padding: '8px 10px' }}>
                      <span style={{ fontSize: '9.5pt', fontWeight: '600' }}>Amount Payable: </span>
                      <span style={{ fontWeight: '800', fontSize: '9.5pt', fontVariantNumeric: 'tabular-nums', marginLeft: '2px' }}>
                        {currSymbol}{fmt(formData.grandTotal)}
                      </span>
                      <span style={{ fontSize: '9.5pt', color: '#475569', fontStyle: 'italic', marginLeft: '6px' }}>
                        ({formData.amountInWords || ''})
                      </span>
                    </td>
                  </tr>
                )

                return rows
              })()}
            </tbody>
          </table>

          {/* ── TRANSPORT & STORAGE CHARGES ── */}
          {formData.transportStorage?.show && (() => {
            const symbol = '₹'
            const rawP = parseFloat(formData.transportStorage.price || 0)
            const option = formData.transportStorage.gstOption || 'withGst'
            const isWithGst = option !== 'withoutGst' && option !== 'none'
            const rate = isWithGst ? parseFloat(formData.transportStorage.gstPercent !== undefined ? formData.transportStorage.gstPercent : 18) : 0

            const baseP = rawP
            const gstA = isWithGst ? baseP * (rate / 100) : 0
            const totP = baseP + gstA

            return (
              <div style={{ marginTop: '14px', fontSize: '9.5pt', color: '#000000', lineHeight: '1.5', pageBreakInside: 'avoid' }}>
                <div style={{ fontWeight: '700' }}>
                  A. {formData.transportStorage.name || 'Transport & storage cart'}
                </div>
                {rawP > 0 && (
                  <div style={{ marginTop: '2px', fontSize: '9.5pt', color: '#1e293b' }}>
                    <span>Basic Price: <strong>{symbol} {fmt(baseP)}</strong></span>
                    {isWithGst && rate > 0 && (
                      <span style={{ marginLeft: '12px' }}>
                        GST ({rate}%): <strong>{symbol} {fmt(gstA)}</strong>
                      </span>
                    )}
                    <span style={{ marginLeft: '12px' }}>
                      Total Price: <strong>{symbol} {fmt(totP)}/-</strong>
                    </span>
                    <span style={{ marginLeft: '8px', fontSize: '9.5pt', color: '#475569', fontStyle: 'italic' }}>
                      ({convertNumberToWords(totP)})
                    </span>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── INSTALLATION CHARGES TABLE ── */}
          {formData.installation?.show && (() => {
            const symbol = '₹'
            const rawP = parseFloat(formData.installation.price || 0)
            const option = formData.installation.gstOption || 'withGst'
            const isWithGst = option !== 'withoutGst' && option !== 'none'
            const rate = isWithGst ? parseFloat(formData.installation.gstPercent !== undefined ? formData.installation.gstPercent : 18) : 0

            const baseP = rawP
            const gstA = isWithGst ? baseP * (rate / 100) : 0
            const totP = baseP + gstA

            return (
              <div style={{ marginTop: '16px', color: '#000000', pageBreakInside: 'avoid' }}>
                <div style={{ fontWeight: '800', fontSize: '9.5pt', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                  Installation Charges :
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #000000', background: 'transparent' }}>
                      <th style={{ ...tdBase, width: '45px', textAlign: 'center', fontWeight: '700' }}>S No.</th>
                      <th style={{ ...tdBase, textAlign: 'left', fontWeight: '700' }}>DESCRIPTION</th>
                      <th style={{ ...tdBase, width: '120px', textAlign: 'right', fontWeight: '700' }}>BASIC PRICE</th>
                      {isWithGst && (
                        <th style={{ ...tdBase, width: '105px', textAlign: 'right', fontWeight: '700' }}>GST ({rate}%)</th>
                      )}
                      <th style={{ ...tdBase, width: '130px', textAlign: 'right', fontWeight: '700' }}>TOTAL PRICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #000000' }}>
                      <td style={{ ...tdBase, textAlign: 'center', fontWeight: '500' }}>1</td>
                      <td style={{ ...tdBase }}>
                        {formData.installation.name || 'Installation & Commissioning Charges'}
                        {isWithGst ? (
                          <span style={{ marginLeft: '6px', fontWeight: '600', color: '#475569', fontSize: '9.5pt' }}>(With GST)</span>
                        ) : (
                          <span style={{ marginLeft: '6px', fontWeight: '600', color: '#475569', fontSize: '9.5pt' }}>(Without GST)</span>
                        )}
                      </td>
                      <td style={{ ...tdBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {symbol} {fmt(baseP)}
                      </td>
                      {isWithGst && (
                        <td style={{ ...tdBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {symbol} {fmt(gstA)}
                        </td>
                      )}
                      <td style={{ ...tdBase, textAlign: 'right', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>
                        {symbol} {fmt(totP)}
                        <div style={{ fontSize: '9.5pt', color: '#475569', fontStyle: 'italic', fontWeight: '400', marginTop: '2px' }}>
                          ({convertNumberToWords(totP)})
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })()}

          {/* ── NOTES / TERMS ── */}
          {formData.sections && formData.sections.length > 0 ? (
            <div style={{ marginTop: '20px', fontFamily: SANS, color: '#000000' }}>
              {[...formData.sections].sort((a, b) => (a.order || 0) - (b.order || 0)).filter(sec => sec.isActive !== false).map((sec, idx) => (
                <div key={sec._id || sec.tempId || idx} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'inline-block', fontWeight: '800', fontSize: '9.5pt', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px dashed #000000', paddingBottom: '3px', marginBottom: '6px' }}>
                    {sec.title}
                  </div>
                  {sec.content && sec.content.startsWith('<') ? (
                    <div className="prose-preview" style={{ fontSize: '9.5pt', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: sec.content }} />
                  ) : (
                    <div style={{ fontSize: '9.5pt', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{sec.content}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            (formData.remarks || formData.termsAndConditions || formData.paymentTerms || formData.deliveryTerms || formData.warranty) && (
              <div style={{ marginTop: '20px', fontFamily: SANS, color: '#000000' }}>
                {formData.deliveryTerms && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'inline-block', fontWeight: '800', fontSize: '9.5pt', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px dashed #000000', paddingBottom: '3px', marginBottom: '6px' }}>
                      Delivery Terms
                    </div>
                    {typeof formData.deliveryTerms === 'string'
                      ? formData.deliveryTerms.startsWith('<')
                        ? <div className="prose-preview" style={{ fontSize: '9.5pt', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: formData.deliveryTerms }} />
                        : <div style={{ fontSize: '9.5pt', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{formData.deliveryTerms}</div>
                      : <div style={{ fontSize: '9.5pt', lineHeight: '1.5' }}>
                        {formData.deliveryTerms.period && <div><strong>Delivery Period:</strong> {formData.deliveryTerms.period}</div>}
                        {formData.deliveryTerms.freight && <div><strong>Freight:</strong> {formData.deliveryTerms.freight}</div>}
                      </div>
                    }
                  </div>
                )}

                {formData.paymentTerms && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'inline-block', fontWeight: '800', fontSize: '9.5pt', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px dashed #000000', paddingBottom: '3px', marginBottom: '6px' }}>
                      Payment Terms
                    </div>
                    <div className="prose-preview" style={{ fontSize: '9.5pt', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: formData.paymentTerms }} />
                  </div>
                )}

                {formData.warranty && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'inline-block', fontWeight: '800', fontSize: '9.5pt', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px dashed #000000', paddingBottom: '3px', marginBottom: '6px' }}>
                      Warranty Coverage
                    </div>
                    <div className="prose-preview" style={{ fontSize: '9.5pt', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: formData.warranty }} />
                  </div>
                )}

                {formData.remarks && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'inline-block', fontWeight: '800', fontSize: '9.5pt', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px dashed #000000', paddingBottom: '3px', marginBottom: '6px' }}>
                      Remarks
                    </div>
                    {typeof formData.remarks === 'string' && formData.remarks.startsWith('<')
                      ? <div className="prose-preview" style={{ fontSize: '9.5pt', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: formData.remarks }} />
                      : <div style={{ fontSize: '9.5pt', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{formData.remarks}</div>
                    }
                  </div>
                )}

                {formData.termsAndConditions && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'inline-block', fontWeight: '800', fontSize: '9.5pt', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px dashed #000000', paddingBottom: '3px', marginBottom: '6px' }}>
                      Terms &amp; Conditions
                    </div>
                    <div className="prose-preview" style={{ fontSize: '9.5pt', lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: formData.termsAndConditions }} />
                  </div>
                )}
              </div>
            )
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
                  <div style={{ fontSize: '9.5pt', marginBottom: '6px' }}>
                    For {companySettings?.companyName || 'YOUR COMPANY'}
                  </div>
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

    </div>
  )
})

export default CurrentClassicTemplate