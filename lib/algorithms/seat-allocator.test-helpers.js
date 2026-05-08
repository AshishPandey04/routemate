// Pure algorithm exported separately for testing
// without needing a DB connection

export function calculatePeakOccupancy(segments) {
    if (segments.length === 0) return 0
  
    const events = []
  
    for (const seg of segments) {
      events.push({ index: seg.fromIndex, delta: +seg.seatsOccupied })
      events.push({ index: seg.toIndex,   delta: -seg.seatsOccupied })
    }
  
    events.sort((a, b) => {
      if (a.index !== b.index) return a.index - b.index
      return a.delta - b.delta
    })
  
    let current = 0
    let peak    = 0
  
    for (const event of events) {
      current += event.delta
      peak = Math.max(peak, current)
    }
  
    return peak
  }