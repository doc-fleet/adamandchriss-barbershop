// src/lib/utils.ts
// Format currency as EGP
export function formatCurrency(amount: number, locale: "en" | "ar" = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Generate booking code: AC-XXXX
export function generateBookingCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `AC-${num}`;
}

// Generate available slots given constraints
export function getAvailableSlots(
  date: Date,
  existingBookings: { start: Date; end: Date }[],
  workingHours: { start: string; end: string },
  bufferMin: number,
  intervalMin: number,
  serviceDuration: number,
  minLeadHours: number
) {
  const slots: Date[] = [];
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  const [startH, startM] = workingHours.start.split(':').map(Number);
  const [endH, endM] = workingHours.end.split(':').map(Number);

  const dayStart = new Date(day);
  dayStart.setHours(startH, startM, 0, 0);

  const dayEnd = new Date(day);
  dayEnd.setHours(endH, endM, 0, 0);

  const now = new Date();
  const minStartTime = new Date(now.getTime() + minLeadHours * 60 * 60 * 1000);

  let current = new Date(Math.max(dayStart.getTime(), minStartTime.getTime()));

  while (current < dayEnd) {
    const slotEnd = new Date(current.getTime() + serviceDuration * 60 * 1000);

    // Check if slot fits within working hours
    if (slotEnd > dayEnd) break;

    // Check for overlap with existing bookings
    const hasOverlap = existingBookings.some((b) => {
      return current < b.end && slotEnd > b.start;
    });

    // Check buffer time — ensure this slot starts at least bufferMin after
    // the end of the previous booking
    const needsBuffer = existingBookings.some((b) => {
      return current < b.end && slotEnd >= b.start && current < b.end;
    });

    if (!hasOverlap && !needsBuffer) {
      slots.push(new Date(current));
    }

    current = new Date(current.getTime() + intervalMin * 60 * 1000);
  }

  return slots;
}

// Format date as YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Format time as HH:MM
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
