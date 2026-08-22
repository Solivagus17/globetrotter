import jsPDF from 'jspdf'

/**
 * GlobeTrotter Travel Guide & Itinerary PDF Generator
 * Palette: Strict GlobeTrotter Warm Charcoal (#1F2937), Gold (#F5B429), Amber (#D97706), and Cream (#FFFDF7).
 * Features:
 * - PAGE 1: Dedicated Luxury Cover Page in website branding.
 * - PAGES 2+: Day-by-Day Progression with alternating Gold/Charcoal day capsules.
 * - Explicit Category Pills: SIGHTSEEING, FOOD & DINING, HOTEL / STAY, FLIGHT, ADVENTURE, etc.
 * - Standard ASCII typography (Rs., to, -, |) with zero glyph bugs or overlapping.
 */
export function generateItineraryPDF(trip, days, dayCityMap = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 16
  const contentWidth = pageWidth - margin * 2

  // GlobeTrotter Signature Warm Gold & Charcoal Palette
  const charcoalDark = [31, 41, 55]      // #1F2937 (Website Charcoal)
  const goldPrimary = [245, 180, 41]     // #F5B429 (GlobeTrotter Gold)
  const goldDark = [217, 119, 6]        // #D97706 (Deep Amber)
  const goldLight = [254, 243, 199]      // #FEF3C7 (Warm Gold Tint)
  const bgWarm = [255, 253, 247]         // Soft Luxury Cream
  const textDark = [31, 41, 55]          // #1F2937
  const textMuted = [107, 114, 128]      // #6B7280
  const borderSoft = [229, 231, 235]     // #E5E7EB
  const lineSoft = [226, 232, 240]       // #E2E8F0

  // Category Configuration (Badges & Colors)
  const CATEGORY_MAP = {
    sightseeing: { label: 'SIGHTSEEING', bg: [240, 253, 244], text: [22, 101, 52] },
    place: { label: 'SIGHTSEEING', bg: [240, 253, 244], text: [22, 101, 52] },
    food: { label: 'FOOD & DINING', bg: [255, 247, 237], text: [194, 65, 12] },
    dining: { label: 'FOOD & DINING', bg: [255, 247, 237], text: [194, 65, 12] },
    restaurant: { label: 'FOOD & DINING', bg: [255, 247, 237], text: [194, 65, 12] },
    stay: { label: 'HOTEL / STAY', bg: [241, 245, 249], text: [51, 65, 85] },
    hotel: { label: 'HOTEL / STAY', bg: [241, 245, 249], text: [51, 65, 85] },
    flight: { label: 'FLIGHT', bg: [254, 242, 242], text: [153, 27, 27] },
    transit: { label: 'TRANSIT', bg: [254, 242, 242], text: [153, 27, 27] },
    adventure: { label: 'ADVENTURE', bg: [254, 243, 199], text: [146, 64, 14] },
    culture: { label: 'CULTURE & ART', bg: [255, 237, 213], text: [154, 52, 18] },
    photo: { label: 'PHOTO SPOT', bg: [250, 245, 255], text: [126, 34, 206] },
    note: { label: 'TRAVEL NOTE', bg: [241, 245, 249], text: [71, 85, 105] },
    other: { label: 'ACTIVITY', bg: [248, 250, 252], text: [71, 85, 105] },
  }

  function getCategoryConfig(rawCat) {
    const key = (rawCat || 'other').toLowerCase().trim()
    return CATEGORY_MAP[key] || CATEGORY_MAP.other
  }

  const totalCost = days.reduce(
    (sum, d) => sum + (d.items || []).reduce((s, it) => s + (parseFloat(it.cost) || 0), 0),
    0
  )
  const totalActivities = days.reduce((sum, d) => sum + (d.items || []).length, 0)
  const destName = (trip.destination_city || trip.name || 'WORLDWIDE').toUpperCase()
  const durationDays = Math.max(days.length, 1)
  const dateRangeStr = `${trip.start_date || 'Flexible'} ${trip.end_date ? 'to ' + trip.end_date : ''}`

  // =========================================================================
  // PAGE 1: DEDICATED LUXURY COVER PAGE (GOLD & CHARCOAL)
  // =========================================================================
  function renderCoverPage() {
    // Background Soft Luxury Cream Fill
    doc.setFillColor(...bgWarm)
    doc.rect(0, 0, pageWidth, pageHeight, 'F')

    // Elegant Outer Geometric Border in Gold & BorderSoft
    doc.setDrawColor(...goldPrimary)
    doc.setLineWidth(0.8)
    doc.roundedRect(10, 10, pageWidth - 20, pageHeight - 20, 4, 4, 'S')

    doc.setDrawColor(...borderSoft)
    doc.setLineWidth(0.3)
    doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3, 'S')

    let yCover = 24

    // Top Brand Pill Emblem
    doc.setFillColor(...charcoalDark)
    doc.roundedRect(pageWidth / 2 - 42, yCover, 84, 11, 3, 3, 'F')

    doc.setFillColor(...goldPrimary)
    doc.circle(pageWidth / 2 - 33, yCover + 5.5, 2.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...goldPrimary)
    doc.text('GLOBETROTTER', pageWidth / 2 - 27, yCover + 7)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    doc.text('TRAVEL GUIDE', pageWidth / 2 + 5, yCover + 7)

    yCover += 36

    // Massive Magazine Destination Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(36)
    doc.setTextColor(...charcoalDark)
    const titleLines = doc.splitTextToSize(destName, contentWidth - 10)
    titleLines.forEach(line => {
      doc.text(line, pageWidth / 2, yCover, { align: 'center' })
      yCover += 13
    })

    // Itinerary Duration Tag
    yCover += 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...goldDark)
    doc.text(`${durationDays}-DAY ITINERARY`, pageWidth / 2, yCover, { align: 'center' })

    // Decorative Line
    yCover += 10
    doc.setDrawColor(...goldPrimary)
    doc.setLineWidth(0.6)
    doc.line(pageWidth / 2 - 35, yCover, pageWidth / 2 + 35, yCover)
    doc.setFillColor(...goldPrimary)
    doc.circle(pageWidth / 2, yCover, 2, 'F')

    yCover += 14

    // Trip Custom Name & Description Box
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin + 4, yCover, contentWidth - 8, 28, 3, 3, 'F')
    doc.setDrawColor(...borderSoft)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin + 4, yCover, contentWidth - 8, 28, 3, 3, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...charcoalDark)
    doc.text((trip.name || 'Personalized Travel Journey').slice(0, 48), margin + 10, yCover + 10)

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...textMuted)
    const descText = trip.description || 'A curated day-by-day travel plan featuring scheduled activities, attractions, stays, and budget estimates.'
    const descLines = doc.splitTextToSize(descText, contentWidth - 20)
    doc.text(descLines.slice(0, 2), margin + 10, yCover + 18)

    yCover += 36

    // Key Trip Metadata Metric Cards (2x2 Grid)
    const cardW = (contentWidth - 16) / 2
    const cardH = 24

    // Card 1: Travel Dates
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin + 4, yCover, cardW, cardH, 3, 3, 'F')
    doc.setDrawColor(...borderSoft)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin + 4, yCover, cardW, cardH, 3, 3, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...textMuted)
    doc.text('TRAVEL DATES & SCHEDULE', margin + 9, yCover + 8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...charcoalDark)
    doc.text(dateRangeStr.slice(0, 28), margin + 9, yCover + 16)

    // Card 2: Duration
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin + 12 + cardW, yCover, cardW, cardH, 3, 3, 'F')
    doc.setDrawColor(...borderSoft)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin + 12 + cardW, yCover, cardW, cardH, 3, 3, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...textMuted)
    doc.text('TOTAL DURATION', margin + 17 + cardW, yCover + 8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...charcoalDark)
    doc.text(`${durationDays} Travel Days`, margin + 17 + cardW, yCover + 16)

    yCover += cardH + 6

    // Card 3: Scheduled Activities
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin + 4, yCover, cardW, cardH, 3, 3, 'F')
    doc.setDrawColor(...borderSoft)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin + 4, yCover, cardW, cardH, 3, 3, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...textMuted)
    doc.text('SCHEDULED ACTIVITIES', margin + 9, yCover + 8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...charcoalDark)
    doc.text(`${totalActivities} Planned Stops`, margin + 9, yCover + 16)

    // Card 4: Estimated Budget (Gold Highlight)
    doc.setFillColor(...goldLight)
    doc.roundedRect(margin + 12 + cardW, yCover, cardW, cardH, 3, 3, 'F')
    doc.setDrawColor(...goldPrimary)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin + 12 + cardW, yCover, cardW, cardH, 3, 3, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...goldDark)
    doc.text('ESTIMATED BUDGET', margin + 17 + cardW, yCover + 8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...charcoalDark)
    doc.text(`Rs. ${Math.round(totalCost).toLocaleString('en-IN')}`, margin + 17 + cardW, yCover + 17)

    yCover += cardH + 20

    // Cover Page Footer
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...textMuted)
    doc.text('Generated with GlobeTrotter - Personalized AI Itinerary & Budget Planner', pageWidth / 2, pageHeight - 20, { align: 'center' })
  }

  // Render Cover Page on Page 1
  renderCoverPage()

  // =========================================================================
  // PAGES 2+: DAY-BY-DAY ITINERARIES (SAMPLE.PDF STYLE)
  // =========================================================================
  doc.addPage()
  let y = margin

  function checkPageBreak(spaceNeeded) {
    if (y + spaceNeeded > pageHeight - 18) {
      doc.addPage()
      y = margin
      drawInnerPageHeader()
    }
  }

  function drawInnerPageHeader() {
    doc.setFillColor(...bgWarm)
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F')
    doc.setDrawColor(...borderSoft)
    doc.setLineWidth(0.2)
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...charcoalDark)
    doc.text('GLOBETROTTER', margin + 4, y + 5.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...textDark)
    doc.text(`-  ${trip.name || destName}`, margin + 30, y + 5.5)

    const pageCount = doc.internal.getNumberOfPages()
    doc.setFontSize(7.5)
    doc.setTextColor(...textMuted)
    doc.text(`Page ${pageCount}`, pageWidth - margin - 14, y + 5.5)

    y += 14
  }

  // Page 2 Header: "SUGGESTED ITINERARY" (Gold & Charcoal)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...charcoalDark)
  doc.text('SUGGESTED', pageWidth / 2, y + 6, { align: 'center' })

  y += 9
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...goldDark)
  doc.text('ITINERARY', pageWidth / 2, y + 6, { align: 'center' })

  y += 16

  // Render Day Progression with alternating Gold & Charcoal Day Capsules
  days.forEach((day, dayIndex) => {
    const items = day.items || []
    const dayCity = dayCityMap[day.date] || day.city_name || trip.destination_city || destName
    const daySubtotal = items.reduce((sum, it) => sum + (parseFloat(it.cost) || 0), 0)
    const isOddDay = dayIndex % 2 === 0
    const dayTheme = isOddDay
      ? { pillBg: goldPrimary, pillText: charcoalDark, border: goldPrimary, stripBg: goldLight }
      : { pillBg: charcoalDark, pillText: [255, 255, 255], border: charcoalDark, stripBg: [241, 245, 249] }

    checkPageBreak(30)

    const capsuleX = margin
    const capsuleW = contentWidth
    const pillW = 28
    const pillH = 14

    // Top Day Header Strip
    doc.setFillColor(dayTheme.stripBg[0], dayTheme.stripBg[1], dayTheme.stripBg[2])
    doc.roundedRect(capsuleX, y, capsuleW, 14, 4, 4, 'F')
    doc.setDrawColor(dayTheme.border[0], dayTheme.border[1], dayTheme.border[2])
    doc.setLineWidth(0.5)
    doc.roundedRect(capsuleX, y, capsuleW, 14, 4, 4, 'S')

    // Day Pill
    doc.setFillColor(dayTheme.pillBg[0], dayTheme.pillBg[1], dayTheme.pillBg[2])
    doc.roundedRect(capsuleX + 2, y + 1.8, pillW, pillH - 3.6, 3, 3, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(dayTheme.pillText[0], dayTheme.pillText[1], dayTheme.pillText[2])
    doc.text(`DAY ${day.day_number || dayIndex + 1}`, capsuleX + 16, y + 8.5, { align: 'center' })

    // Date & Location Info
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...charcoalDark)
    doc.text(`${day.formatted_date || day.date}`, capsuleX + pillW + 6, y + 8.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...textMuted)
    doc.text(`-  ${dayCity}  (${items.length} ${items.length === 1 ? 'stop' : 'stops'})`, capsuleX + pillW + 42, y + 8.5)

    // Subtotal on Right
    if (daySubtotal > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...goldDark)
      doc.text(`Day Total: Rs. ${Math.round(daySubtotal).toLocaleString('en-IN')}`, capsuleX + capsuleW - 6, y + 8.5, { align: 'right' })
    }

    y += 18

    // Activities List with Underlines
    if (items.length === 0) {
      checkPageBreak(12)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(...textMuted)
      doc.text('No scheduled activities for this date.', margin + 8, y + 4)
      y += 10
    } else {
      items.forEach((item, itemIdx) => {
        const itemCost = parseFloat(item.cost) || 0
        const rawCat = (item.category || 'other').toLowerCase()
        const catCfg = getCategoryConfig(rawCat)

        let itemTitle = item.name || 'Activity'
        let notesText = (item.notes || '').trim()

        if (rawCat === 'flight') {
          try {
            const parsed = JSON.parse(item.notes)
            if (parsed && typeof parsed === 'object' && parsed.flight_no) {
              itemTitle = `${parsed.flight_no}: ${parsed.dep_city || 'Origin'} to ${parsed.arr_city || 'Destination'}`
              notesText = `Departure: ${parsed.dep_time || '--'} | Arrival: ${parsed.arr_time || '--'} | ${parsed.status || 'Booked'}`
              if (parsed.pnr) notesText += ` | PNR: ${parsed.pnr}`
              if (parsed.extra_notes) notesText += ` - ${parsed.extra_notes}`
            }
          } catch (e) {}
        }

        const textAvailableW = contentWidth - 56
        const titleLines = doc.splitTextToSize(itemTitle, textAvailableW)
        const noteLines = notesText ? doc.splitTextToSize(notesText, textAvailableW) : []

        // Total row height including category pill header
        const rowHeight = 11 + (titleLines.length * 4.2) + (noteLines.length * 3.6)
        checkPageBreak(rowHeight + 4)

        // Step Number Badge on left
        doc.setFillColor(...goldLight)
        doc.roundedRect(margin + 2, y + 1.5, 12, 5, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...goldDark)
        doc.text(`#${itemIdx + 1}`, margin + 8, y + 5, { align: 'center' })

        // Explicit Category Pill Badge (SIGHTSEEING, FOOD & DINING, HOTEL / STAY, etc.)
        const catBadgeW = Math.min(36, doc.getTextWidth(catCfg.label) + 6)
        doc.setFillColor(catCfg.bg[0], catCfg.bg[1], catCfg.bg[2])
        doc.roundedRect(margin + 17, y + 1.5, catBadgeW, 5, 1.5, 1.5, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6)
        doc.setTextColor(catCfg.text[0], catCfg.text[1], catCfg.text[2])
        doc.text(catCfg.label, margin + 20, y + 5)

        // Location Tag if present
        if (item.location_name && item.location_name !== dayCity) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.setTextColor(...textMuted)
          doc.text(`[ ${item.location_name} ]`, margin + 18 + catBadgeW + 3, y + 5)
        }

        let curY = y + 10.5

        // Activity Title Lines
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...textDark)
        titleLines.forEach(line => {
          doc.text(line, margin + 18, curY)
          curY += 4.2
        })

        // Notes / Details Lines
        if (noteLines.length > 0) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(...textMuted)
          noteLines.forEach(line => {
            doc.text(line, margin + 18, curY)
            curY += 3.6
          })
        }

        // Cost on Right
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        if (itemCost > 0) {
          doc.setTextColor(...goldDark)
          doc.text(`Rs. ${Math.round(itemCost).toLocaleString('en-IN')}`, pageWidth - margin - 4, y + 5.5, { align: 'right' })
        } else {
          doc.setTextColor(...textMuted)
          doc.setFontSize(7.5)
          doc.text('Free', pageWidth - margin - 4, y + 5.5, { align: 'right' })
        }

        // Clean subtle horizontal underline separating items
        doc.setDrawColor(...lineSoft)
        doc.setLineWidth(0.2)
        doc.line(margin + 18, y + rowHeight - 1, pageWidth - margin, y + rowHeight - 1)

        y += rowHeight + 1
      })
    }

    y += 6
  })

  // Final Summary & Highlights Capsule (Matching sample.pdf "OTHER THINGS TO DO" capsule)
  checkPageBreak(32)
  doc.setFillColor(...goldLight)
  doc.roundedRect(margin, y, contentWidth, 24, 4, 4, 'F')
  doc.setDrawColor(...goldPrimary)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, y, contentWidth, 24, 4, 4, 'S')

  doc.setFillColor(...charcoalDark)
  doc.roundedRect(margin + 3, y + 3, 34, 18, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...goldPrimary)
  doc.text('TRIP', margin + 20, y + 9.5, { align: 'center' })
  doc.text('SUMMARY', margin + 20, y + 14.5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...textDark)
  doc.text(`- Total Duration: ${durationDays} Days  |  Total Scheduled Activities: ${totalActivities}`, margin + 42, y + 9)
  doc.text(`- Destination: ${destName}  |  Exported via GlobeTrotter`, margin + 42, y + 15)

  // Grand Total on Right
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...charcoalDark)
  doc.text('TOTAL ESTIMATE', pageWidth - margin - 6, y + 9, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...goldDark)
  doc.text(`Rs. ${Math.round(totalCost).toLocaleString('en-IN')}`, pageWidth - margin - 6, y + 16, { align: 'right' })

  // Download PDF
  const safeTitle = (trip.name || 'GlobeTrotter_Trip').replace(/[^a-zA-Z0-9_-]/g, '_')
  doc.save(`${safeTitle}_Itinerary.pdf`)
}
