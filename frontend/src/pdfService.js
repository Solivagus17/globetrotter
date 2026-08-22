import jsPDF from 'jspdf'

/**
 * GlobeTrotter Luxury Travel Itinerary PDF Generator
 * Renders in GlobeTrotter's signature Warm Yellow / Gold color scheme (#F5B429 / #E0A11C),
 * with a clean, structured tabular layout, clear columns, daily subtotals, and budget metrics in Rupees (₹).
 */
export function generateItineraryPDF(trip, days, dayCityMap = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // GlobeTrotter Signature Yellow & Gold Palette
  const goldPrimary = [245, 180, 41]   // #F5B429
  const goldDark = [224, 161, 28]      // #E0A11C
  const goldLight = [255, 243, 214]    // #FFF3D6
  const bgWarm = [253, 248, 238]       // #FDF8EE
  const textDark = [33, 28, 16]        // #211C10
  const textMuted = [138, 127, 99]     // #8A7F63
  const borderCream = [240, 228, 200]  // #F0E4C8
  const tableAltRow = [254, 251, 244]  // Very light warm cream

  // Category Color Map
  const categoryBadgeColors = {
    sightseeing: [39, 174, 96],  // Green
    place: [39, 174, 96],
    food: [230, 126, 34],        // Warm Orange
    dining: [230, 126, 34],
    stay: [41, 128, 185],        // Royal Blue
    hotel: [41, 128, 185],
    flight: [37, 99, 235],       // Cobalt Blue
    photo: [142, 68, 173],       // Purple
    note: [108, 122, 137],       // Slate
    adventure: [211, 84, 0],     // Deep Amber
    culture: [192, 57, 43],      // Crimson
  }

  // Helper to ensure page breaks don't clip table rows
  function checkPageBreak(spaceNeeded) {
    if (y + spaceNeeded > pageHeight - 18) {
      doc.addPage()
      y = margin + 8
      drawMiniPageHeader()
    }
  }

  // Mini Header on subsequent pages
  function drawMiniPageHeader() {
    doc.setFillColor(...bgWarm)
    doc.rect(margin, y, contentWidth, 8, 'F')
    doc.setDrawColor(...borderCream)
    doc.setLineWidth(0.2)
    doc.rect(margin, y, contentWidth, 8, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...goldDark)
    doc.text('GLOBETROTTER', margin + 3, y + 5.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...textDark)
    doc.text(`·  ${(trip.name || 'Travel Itinerary').slice(0, 50)}`, margin + 28, y + 5.5)

    const pageCount = doc.internal.getNumberOfPages()
    doc.setFontSize(7.5)
    doc.setTextColor(...textMuted)
    doc.text(`Page ${pageCount}`, pageWidth - margin - 14, y + 5.5)

    y += 12
  }

  // Draw Top Banner (Page 1)
  function drawTopCoverBanner() {
    // Outer Header Box with soft warm background
    doc.setFillColor(...bgWarm)
    doc.roundedRect(margin, y, contentWidth, 36, 3, 3, 'F')
    doc.setDrawColor(...goldPrimary)
    doc.setLineWidth(0.6)
    doc.roundedRect(margin, y, contentWidth, 36, 3, 3, 'S')

    // GT Emblem in Gold
    doc.setFillColor(...goldPrimary)
    doc.roundedRect(margin + 4, y + 4, 12, 12, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(33, 28, 16)
    doc.text('GT', margin + 6.2, y + 12)

    // Brand Label
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...goldDark)
    doc.text('GLOBETROTTER', margin + 19, y + 9)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...textMuted)
    doc.text('OFFICIAL TRIP PLANNER & ITINERARY', margin + 50, y + 9)

    // Trip Name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...textDark)
    const tripTitle = (trip.name || 'My Travel Journey').slice(0, 42)
    doc.text(tripTitle, margin + 19, y + 19)

    // Destination & Date Span
    const destName = trip.destination_city || trip.description || trip.name || 'Worldwide'
    const dateRange = `${trip.start_date || 'Flexible'} ${trip.end_date ? '→ ' + trip.end_date : ''} · ${days.length} ${days.length === 1 ? 'Day' : 'Days'}`

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...textMuted)
    doc.text(`Destination: ${destName}   |   Dates: ${dateRange}`, margin + 19, y + 27)

    // Estimated Total Budget Box (Right Header)
    const totalCost = days.reduce((sum, d) => sum + (d.items || []).reduce((s, it) => s + (parseFloat(it.cost) || 0), 0), 0)
    doc.setFillColor(...goldPrimary)
    doc.roundedRect(pageWidth - margin - 50, y + 6, 46, 24, 2, 2, 'F')
    doc.setDrawColor(...goldDark)
    doc.setLineWidth(0.4)
    doc.roundedRect(pageWidth - margin - 50, y + 6, 46, 24, 2, 2, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...textDark)
    doc.text('ESTIMATED BUDGET', pageWidth - margin - 46, y + 13)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...textDark)
    doc.text(`Rs. ${Math.round(totalCost).toLocaleString('en-IN')}`, pageWidth - margin - 46, y + 22)

    y += 42
  }

  // Draw Header
  drawTopCoverBanner()

  // Iterate Days and Render Tabular Schedules
  days.forEach((day, dayIndex) => {
    const items = day.items || []
    const dayCity = dayCityMap[day.date] || day.city_name || trip.destination_city || trip.description || 'Destination'
    const daySubtotal = items.reduce((sum, it) => sum + (parseFloat(it.cost) || 0), 0)

    // Ensure space for Day Header + Table Header + at least one row
    checkPageBreak(32)

    // Day Header Bar (Gold / Warm Accent)
    doc.setFillColor(...goldLight)
    doc.roundedRect(margin, y, contentWidth, 9.5, 2, 2, 'F')
    doc.setDrawColor(...borderCream)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin, y, contentWidth, 9.5, 2, 2, 'S')

    // Day Number Pill
    doc.setFillColor(...goldPrimary)
    doc.roundedRect(margin + 1.5, y + 1.5, 17, 6.5, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...textDark)
    doc.text(`DAY ${day.day_number || dayIndex + 1}`, margin + 3.5, y + 5.8)

    // Formatted Date & Location
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...textDark)
    doc.text(`${day.formatted_date || day.date}`, margin + 21, y + 6.2)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...textMuted)
    doc.text(`·  ${dayCity}  (${items.length} ${items.length === 1 ? 'entry' : 'entries'})`, margin + 56, y + 6.2)

    // Day Subtotal on Right
    if (daySubtotal > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...goldDark)
      doc.text(`Subtotal: Rs. ${Math.round(daySubtotal).toLocaleString('en-IN')}`, pageWidth - margin - 44, y + 6.2)
    }

    y += 11.5

    // Tabular Grid Dimensions
    const colSeqW = 12
    const colCatW = 24
    const colCostW = 28
    const colDetailsW = contentWidth - colSeqW - colCatW - colCostW // 118mm

    // Draw Table Header
    doc.setFillColor(...goldPrimary)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setDrawColor(...goldDark)
    doc.setLineWidth(0.2)
    doc.rect(margin, y, contentWidth, 7, 'S')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...textDark)
    doc.text('#', margin + 4.5, y + 4.8)
    doc.text('CATEGORY', margin + colSeqW + 2, y + 4.8)
    doc.text('SCHEDULED ACTIVITY / ATTRACTION DETAILS', margin + colSeqW + colCatW + 3, y + 4.8)
    doc.text('EST. COST (₹)', pageWidth - margin - colCostW + 5, y + 4.8)

    y += 7

    // If No Items for this Day
    if (items.length === 0) {
      checkPageBreak(10)
      doc.setFillColor(255, 255, 255)
      doc.rect(margin, y, contentWidth, 8, 'FD')
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(...textMuted)
      doc.text('No scheduled activities for this date. Use Discover to explore and add places.', margin + 8, y + 5.5)
      y += 11
    } else {
      items.forEach((item, itemIdx) => {
        const itemCost = parseFloat(item.cost) || 0
        const isAlt = itemIdx % 2 === 1
        const catKey = (item.category || 'place').toLowerCase()

        // Parse flight or special JSON notes
        let itemTitle = item.name || 'Activity'
        let extraInfo = (item.notes || '').trim()
        let flightRoute = ''

        if (catKey === 'flight') {
          try {
            const parsed = JSON.parse(item.notes)
            if (parsed && typeof parsed === 'object' && parsed.flight_no) {
              itemTitle = `${parsed.flight_no}: ${parsed.dep_city || 'Origin'} → ${parsed.arr_city || 'Destination'}`
              flightRoute = `Departure: ${parsed.dep_time || '--'} | Arrival: ${parsed.arr_time || '--'} [${parsed.status || 'Booked'}]`
              extraInfo = `${flightRoute} ${parsed.pnr ? '· PNR: ' + parsed.pnr : ''} ${parsed.extra_notes ? '· ' + parsed.extra_notes : ''}`
            }
          } catch (e) {}
        }

        // Calculate needed row height based on text lines
        const lines = doc.splitTextToSize(extraInfo, colDetailsW - 6)
        const hasExtra = lines.length > 0 && extraInfo.length > 0
        const rowHeight = hasExtra ? Math.min(22, 10 + lines.length * 3.6) : 9

        checkPageBreak(rowHeight + 2)

        // Row Background
        doc.setFillColor(isAlt ? tableAltRow[0] : 255, isAlt ? tableAltRow[1] : 255, isAlt ? tableAltRow[2] : 255)
        doc.setDrawColor(...borderCream)
        doc.setLineWidth(0.2)
        doc.rect(margin, y, contentWidth, rowHeight, 'FD')

        // Column 1: Sequence #
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...textMuted)
        doc.text(String(itemIdx + 1).padStart(2, '0'), margin + 3.5, y + 6)

        // Column 2: Category Pill
        const badgeColor = categoryBadgeColors[catKey] || [100, 116, 139]
        doc.setFillColor(...badgeColor)
        doc.roundedRect(margin + colSeqW + 1, y + 2.2, 21, 4.6, 1, 1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6)
        doc.setTextColor(255, 255, 255)
        doc.text((item.category || 'PLACE').toUpperCase().slice(0, 9), margin + colSeqW + 3, y + 5.5)

        // Column 3: Title & Notes
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(...textDark)
        doc.text(itemTitle.slice(0, 56), margin + colSeqW + colCatW + 3, y + 5.6)

        if (hasExtra) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(...textMuted)
          doc.text(lines.slice(0, 3), margin + colSeqW + colCatW + 3, y + 9.8)
        }

        // Column 4: Cost in Rupees (₹)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        if (itemCost > 0) {
          doc.setTextColor(...goldDark)
          const costStr = `Rs. ${Math.round(itemCost).toLocaleString('en-IN')}`
          doc.text(costStr, pageWidth - margin - 6, y + 6, { align: 'right' })
        } else {
          doc.setTextColor(...textMuted)
          doc.text('Free / Included', pageWidth - margin - 6, y + 6, { align: 'right' })
        }

        // Vertical divider lines for crisp table look
        doc.setDrawColor(...borderCream)
        doc.setLineWidth(0.15)
        doc.line(margin + colSeqW, y, margin + colSeqW, y + rowHeight)
        doc.line(margin + colSeqW + colCatW, y, margin + colSeqW + colCatW, y + rowHeight)
        doc.line(pageWidth - margin - colCostW, y, pageWidth - margin - colCostW, y + rowHeight)

        y += rowHeight
      })

      // Day Subtotal Row
      doc.setFillColor(...bgWarm)
      doc.rect(margin, y, contentWidth, 7, 'F')
      doc.setDrawColor(...borderCream)
      doc.setLineWidth(0.2)
      doc.rect(margin, y, contentWidth, 7, 'S')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...textDark)
      doc.text(`DAY ${day.day_number || dayIndex + 1} TOTAL`, margin + colSeqW + colCatW + 3, y + 4.8)

      doc.setFontSize(8.5)
      doc.setTextColor(...goldDark)
      doc.text(`Rs. ${Math.round(daySubtotal).toLocaleString('en-IN')}`, pageWidth - margin - 6, y + 4.8, { align: 'right' })

      y += 10
    }

    y += 2
  })

  // Final Summary & Analytics Table Box
  checkPageBreak(38)

  y += 2
  doc.setFillColor(...bgWarm)
  doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F')
  doc.setDrawColor(...goldPrimary)
  doc.setLineWidth(0.6)
  doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...textDark)
  doc.text('ITINERARY TRIP SUMMARY & FINANCIALS', margin + 6, y + 8)

  const totalPlaces = days.reduce((sum, d) => sum + (d.items || []).length, 0)
  const grandTotal = days.reduce((sum, d) => sum + (d.items || []).reduce((s, it) => s + (parseFloat(it.cost) || 0), 0), 0)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...textMuted)
  doc.text(`• Total Travel Duration: ${days.length} Days`, margin + 6, y + 15)
  doc.text(`• Total Scheduled Attractions & Stays: ${totalPlaces} Activities`, margin + 6, y + 20)
  doc.text(`• Official Currency: Indian Rupees (INR / ₹)  |  Exported on ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`, margin + 6, y + 25)

  // Grand Total Box in Amber
  doc.setFillColor(...goldPrimary)
  doc.roundedRect(pageWidth - margin - 54, y + 5, 48, 20, 2, 2, 'F')
  doc.setDrawColor(...goldDark)
  doc.setLineWidth(0.3)
  doc.roundedRect(pageWidth - margin - 54, y + 5, 48, 20, 2, 2, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...textDark)
  doc.text('GRAND TOTAL ESTIMATE', pageWidth - margin - 51, y + 11)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...textDark)
  doc.text(`Rs. ${Math.round(grandTotal).toLocaleString('en-IN')}`, pageWidth - margin - 51, y + 19)

  // Save the custom PDF file directly
  const safeTitle = (trip.name || 'GlobeTrotter_Trip').replace(/[^a-zA-Z0-9_-]/g, '_')
  doc.save(`${safeTitle}_Itinerary.pdf`)
}
