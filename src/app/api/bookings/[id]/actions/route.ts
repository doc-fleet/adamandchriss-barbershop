// src/app/api/bookings/[id]/actions/route.ts
// Admin-facing endpoint to perform actions on a booking:
//   confirm, cancel, reassign (barber), reschedule
// POST /api/bookings/:id/actions
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sendBookingNotification, sendBarberNotification, BookingAction } from '@/lib/notifications';

// Booking statuses that are terminal (cannot be modified further)
const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'NO_SHOW']);

// Booking statuses that represent active appointments (for availability checks)
const ACTIVE_STATUSES = ['PENDING_DEPOSIT', 'CONFIRMED', 'IN_PROGRESS', 'CANCELLATION_PENDING'];

// Valid values a booking status may be set to by an admin action
const VALID_ACTIONS = ['confirm', 'cancel', 'reassign', 'reschedule'] as const;

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    client: true;
    service: true;
    barber: true;
    payments: true;
  };
}>;

/** Extract the admin-token cookie and return 401 if not authenticated. */
function requireAdmin(): NextResponse | null {
  const cookieStore = cookies();
  const token = cookieStore.get('admin-token')?.value;
  if (!token || token !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** Returns true if another booking for `barberId` conflicts with [startAt, endAt]. */
async function hasConflictingBooking(
  barberId: number,
  startAt: Date,
  endAt: Date,
  excludeId: number
): Promise<boolean> {
  const conflict = await prisma.booking.findFirst({
    where: {
      barberId,
      id: { not: excludeId },
      startAt: { lte: endAt },
      endAt: { gte: startAt },
      status: { in: ACTIVE_STATUSES },
    },
  });
  return !!conflict;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // --- 1. Auth ---
    const unauthorized = requireAdmin();
    if (unauthorized) return unauthorized;

    // --- 2. Parse booking ID from URL ---
    const bookingId = parseInt(params.id, 10);
    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    // --- 3. Parse & validate body ---
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { action, newBarberId, newDatetime } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    if (!VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number])) {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Valid actions: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // --- 4. Fetch booking ---
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        service: true,
        barber: true,
        payments: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const now = new Date();
    let updatedBooking: BookingWithRelations;
    let actionType: BookingAction;
    let notificationOptions: { newBarberName?: string } | undefined;

    // --- 5. Execute action ---
    switch (action) {
      case 'confirm': {
        // Business rule: can't confirm without payment
        const hasPaidPayment = booking.payments.some((p) => p.status === 'PAID');
        if (!hasPaidPayment) {
          return NextResponse.json(
            { error: 'Cannot confirm booking without payment' },
            { status: 400 }
          );
        }
        // Business rule: can't confirm terminal bookings
        if (TERMINAL_STATUSES.has(booking.status)) {
          return NextResponse.json(
            { error: `Cannot confirm booking in ${booking.status} status` },
            { status: 400 }
          );
        }
        // Already confirmed
        if (booking.status === 'CONFIRMED') {
          return NextResponse.json(
            { error: 'Booking is already confirmed' },
            { status: 400 }
          );
        }

        updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CONFIRMED' },
          include: {
            client: true,
            service: true,
            barber: true,
            payments: true,
          },
        });
        actionType = 'confirm';
        break;
      }

      case 'cancel': {
        // Business rule: can't cancel past bookings
        if (booking.startAt <= now) {
          return NextResponse.json(
            { error: 'Cannot cancel past bookings' },
            { status: 400 }
          );
        }
        // Business rule: can't cancel terminal bookings
        if (booking.status === 'CANCELLED') {
          return NextResponse.json(
            { error: 'Booking is already cancelled' },
            { status: 400 }
          );
        }
        if (booking.status === 'COMPLETED') {
          return NextResponse.json(
            { error: 'Cannot cancel completed bookings' },
            { status: 400 }
          );
        }
        if (booking.status === 'NO_SHOW') {
          return NextResponse.json(
            { error: 'Cannot cancel no-show bookings' },
            { status: 400 }
          );
        }

        updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CANCELLED' },
          include: {
            client: true,
            service: true,
            barber: true,
            payments: true,
          },
        });
        actionType = 'cancel';
        break;
      }

      case 'reassign': {
        if (!newBarberId || typeof newBarberId !== 'number') {
          return NextResponse.json(
            { error: 'newBarberId is required for the reassign action' },
            { status: 400 }
          );
        }
        if (TERMINAL_STATUSES.has(booking.status)) {
          return NextResponse.json(
            { error: `Cannot reassign booking in ${booking.status} status` },
            { status: 400 }
          );
        }

        const newBarber = await prisma.barber.findUnique({
          where: { id: newBarberId },
        });
        if (!newBarber) {
          return NextResponse.json({ error: 'Barber not found' }, { status: 404 });
        }
        if (!newBarber.active) {
          return NextResponse.json(
            { error: 'Selected barber is not active' },
            { status: 400 }
          );
        }
        if (newBarberId === booking.barberId) {
          return NextResponse.json(
            { error: 'Booking is already assigned to this barber' },
            { status: 400 }
          );
        }

        // Check the new barber is available at the current time slot
        const conflict = await hasConflictingBooking(
          newBarberId,
          booking.startAt,
          booking.endAt,
          bookingId
        );
        if (conflict) {
          return NextResponse.json(
            { error: 'Selected barber is not available at this time' },
            { status: 409 }
          );
        }

        updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: { barberId: newBarberId },
          include: {
            client: true,
            service: true,
            barber: true,
            payments: true,
          },
        });
        actionType = 'reassign';
        notificationOptions = { newBarberName: updatedBooking.barber?.name };
        break;
      }

      case 'reschedule': {
        if (!newDatetime || typeof newDatetime !== 'string') {
          return NextResponse.json(
            { error: 'newDatetime is required for the reschedule action' },
            { status: 400 }
          );
        }
        if (TERMINAL_STATUSES.has(booking.status)) {
          return NextResponse.json(
            { error: `Cannot reschedule booking in ${booking.status} status` },
            { status: 400 }
          );
        }

        const newStart = new Date(newDatetime);
        if (isNaN(newStart.getTime())) {
          return NextResponse.json(
            { error: 'Invalid datetime format — expected ISO 8601 string' },
            { status: 400 }
          );
        }
        if (newStart <= now) {
          return NextResponse.json(
            { error: 'Cannot reschedule to a past time' },
            { status: 400 }
          );
        }

        const duration = booking.service?.durationMin || 30;
        const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

        const conflict = await hasConflictingBooking(
          booking.barberId,
          newStart,
          newEnd,
          bookingId
        );
        if (conflict) {
          return NextResponse.json(
            { error: 'Selected time slot is not available' },
            { status: 409 }
          );
        }

        updatedBooking = await prisma.booking.update({
          where: { id: bookingId },
          data: { startAt: newStart, endAt: newEnd },
          include: {
            client: true,
            service: true,
            barber: true,
            payments: true,
          },
        });
        actionType = 'reschedule';
        break;
      }

      default:
        // Unreachable — validated above, but keeps TypeScript happy
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // --- 6. Notify client ---
    // Fire-and-forget: never block the response on notification failures
    try {
      await sendBookingNotification(
        updatedBooking,
        updatedBooking.client,
        actionType,
        notificationOptions
      );
    } catch (notifyError) {
      console.error(
        `[actions] Notification failed (non-blocking):`,
        notifyError
      );
    }

    // --- 6b. Notify barber on assignment change (reassign) ---
    // Sends a WhatsApp message to the new barber when a booking is reassigned.
    if (actionType === 'reassign' && updatedBooking.barber?.phone) {
      try {
        await sendBarberNotification(
          updatedBooking,
          { name: updatedBooking.barber.name, phone: updatedBooking.barber.phone }
        );
      } catch (notifyError) {
        console.error(
          `[actions] Barber notification failed (non-blocking):`,
          notifyError
        );
      }
    }

    // --- 7. Response ---
    const messages: Record<BookingAction, { en: string; ar: string }> = {
      confirm: { en: 'Booking confirmed', ar: 'تم تأكيد الحجز' },
      cancel: { en: 'Booking cancelled', ar: 'تم إلغاء الحجز' },
      reassign: { en: 'Barber reassigned', ar: 'تم تغيير الحلاق' },
      reschedule: { en: 'Booking rescheduled', ar: 'تمت إعادة جدولة الحجز' },
    };
    const locale = updatedBooking.client.language === 'ar' ? 'ar' : 'en';

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: messages[actionType][locale],
    });
  } catch (error: unknown) {
    console.error('Booking action error:', error);
    return NextResponse.json(
      { error: 'Failed to process booking action' },
      { status: 500 }
    );
  }
}
