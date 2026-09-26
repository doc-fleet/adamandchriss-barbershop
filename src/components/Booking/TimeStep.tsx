'use client';
// src/components/Booking/TimeStep.tsx
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { schedulingConfig } from '@/config/site';
import { getAvailableSlots, formatTime, formatDate } from '@/lib/utils';
import type { Locale } from '@/i18n';

interface Service {
  slug: string;
  name_en: string;
  name_ar: string;
  duration_min: number;
  price_egp: number;
  deposit_pct: number;
}

interface Booking {
  start: Date;
  end: Date;
}

interface Props {
  service: Service;
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onNext: () => void;
  onBack: () => void;
  locale: Locale;
}

// Mock bookings for the selected date (in real app, fetched from DB)
function getMockBookings(date: string): Booking[] {
  // Generate some mock bookings for demonstration
  const day = new Date(date);
  const bookings: Booking[] = [];
  // Booked 11:00-12:00 and 15:00-16:00
  bookings.push({
    start: new Date(day.setHours(11, 0, 0, 0)),
    end: new Date(day.setHours(12, 0, 0, 0)),
  });
  day.setHours(15, 0, 0, 0);
  const b2start = new Date(day);
  day.setHours(15, 0, 0, 0);
  const b2end = new Date(day.setHours(16, 0, 0, 0));
  bookings.push({ start: b2start, end: b2end });
  return bookings;
}

export default function TimeStep({ service, selectedDate, selectedTime, onSelectDate, onSelectTime, onNext, onBack, locale }: Props) {
  const t = useTranslations('booking');
  const servicesT = useTranslations('services');
  const commonT = useTranslations('common');

  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);

  useEffect(() => {
    if (!selectedDate) return;

    const bookings = getMockBookings(selectedDate);
    const slots = getAvailableSlots(
      new Date(selectedDate),
      bookings,
      schedulingConfig.workingHours,
      schedulingConfig.travelBufferMin,
      schedulingConfig.slotIntervalMin,
      service.duration_min,
      schedulingConfig.minLeadHours
    );
    setAvailableSlots(slots);
  }, [selectedDate, service]);

  // Generate next 7 days for the date picker
  const today = new Date();
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <>
      <h2 className="text-xl font-bold text-primary-800 mb-4">{t('selectTime')}</h2>

      {/* Service summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <p className="font-medium">
          {locale === 'en' ? service.name_en : service.name_ar}
        </p>
        <p className="text-sm text-gray-600">
          {service.duration_min} {servicesT('minutes')} · {service.price_egp} EGP
        </p>
      </div>

      {/* Date picker */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">{t('selectTime')}</label>
        <div className="grid grid-cols-7 gap-2">
          {dateOptions.map((d) => {
            const dateStr = formatDate(d);
            const isSelected = selectedDate === dateStr;
            const isToday = d.toDateString() === today.toDateString();
            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`p-2 text-center rounded-lg border transition ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50 text-primary-800'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xs text-gray-500">{d.toLocaleDateString(locale, { weekday: 'short' })}</div>
                <div className="text-lg font-bold">{d.getDate()}</div>
                <div className="text-xs">{d.toLocaleDateString(locale, { month: 'short' })}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            {availableSlots.length === 0 ? t('noSlots') : 'Select a time'}
          </label>
          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mb-6">
              {availableSlots.map((slot, i) => {
                const timeStr = formatTime(slot);
                const isSelected = selectedTime === timeStr;
                return (
                  <button
                    key={i}
                    onClick={() => onSelectTime(timeStr)}
                    className={`p-3 text-center rounded-lg border font-medium transition ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50 text-primary-800'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {timeStr}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">{t('noSlots')}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-full hover:bg-gray-100 transition"
        >
          {commonT('back')}
        </button>
        <button
          onClick={onNext}
          disabled={!selectedDate || !selectedTime}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {commonT('next')}
        </button>
      </div>
    </>
  );
}
