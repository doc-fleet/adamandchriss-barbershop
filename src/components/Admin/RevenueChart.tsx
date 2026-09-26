// src/components/Admin/RevenueChart.tsx
// Pure SVG bar chart — no charting library dependency.
// Server component: receives data + locale, renders a 7-day revenue bar chart.
// RTL-aware: in Arabic mode the chart flips horizontally.

interface DayRevenue {
  day: string; // ISO date "YYYY-MM-DD"
  label: string; // short label for axis, e.g. "Mon" / "الإثنين"
  amount: number; // EGP
}

interface RevenueChartProps {
  data: DayRevenue[];
  locale: 'en' | 'ar';
  color?: string;
}

function dayShortLabel(iso: string, locale: 'en' | 'ar'): string {
  const d = new Date(iso + 'T12:00:00');
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short' };
  const short = d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', opts);
  // Arabic day names from toLocaleDateString come back as "الإثنين" etc — keep as-is.
  // English short names come back like "Mon" — uppercase first letter already done by ICU.
  return short;
}

function formatCurrency(amount: number, locale: 'en' | 'ar'): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function RevenueChart({ data, locale, color = '#4f46e5' }: RevenueChartProps) {
  if (!data.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        {locale === 'en' ? 'No revenue data for the last 7 days.' : 'لا توجد بيانات إيرادات ليوم السبعة الأخيرة.'}
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const chartHeight = 220;
  const chartWidth = 480;
  const barGap = 12;
  const topPad = 24;
  const bottomPad = 44;
  const plotHeight = chartHeight - topPad - bottomPad;
  const plotWidth = chartWidth - barGap * 2;
  const barWidth = Math.min(48, (plotWidth - barGap * (data.length - 1)) / data.length);

  // Pick an accent for the "no data" empty bars
  const emptyColor = '#e5e7eb';

  // In Arabic (RTL), reverse bar order so the most recent day is on the right
  // (mirroring the LTR layout, where most recent is on the right).
  const ordered = locale === 'ar' ? [...data].reverse() : data;

  const bars = ordered.map((d, i) => {
    const x = barGap + i * (barWidth + barGap);
    const barH = d.amount > 0 ? (d.amount / maxAmount) * plotHeight : 0;
    const y = chartHeight - bottomPad - barH;
    const fill = d.amount > 0 ? color : emptyColor;
    return { x, y, w: barWidth, h: barH, fill, day: d, amount: d.amount };
  });

  // Y-axis gridlines + labels (3 lines)
  const gridCount = 3;
  const gridLabels = [];
  for (let g = 0; g <= gridCount; g++) {
    const val = Math.round((maxAmount / gridCount) * g);
    const gy = chartHeight - bottomPad - (plotHeight / gridCount) * g;
    gridLabels.push({ y: gy, label: formatCurrency(val, locale) });
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[320px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">
            {locale === 'en' ? 'Revenue — Last 7 Days' : 'الإيرادات — آخر 7 أيام'}
          </h4>
          <span className="text-xs text-gray-400">
            {locale === 'en' ? 'Total EGP' : 'إجمالي EGP'}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto"
          style={locale === 'ar' ? { transform: 'scaleX(-1)' } : undefined}
          aria-label={locale === 'en' ? 'Revenue chart last 7 days' : 'مخطط الإيرادات آخر 7 أيام'}
        >
          {/* Y-axis gridlines */}
          {gridLabels.map((gl, gi) => (
            <g key={gi}>
              <line
                x1={barGap}
                y1={gl.y}
                x2={chartWidth - barGap}
                y2={gl.y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={barGap - 6}
                y={gl.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
                className={locale === 'ar' ? 'ml-2' : ''}
              >
                {gl.label}
              </text>
            </g>
          ))}

          {/* Bars */}
          {bars.map((b, i) => (
            <g key={i}>
              {/* Bar */}
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={Math.max(b.h, 0)}
                fill={b.fill}
                rx="3"
                ry="3"
              />
              {/* Value label on top of bar */}
              {b.amount > 0 && (
                <text
                  x={b.x + b.w / 2}
                  y={b.y - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#4b5563"
                  className={locale === 'ar' ? 'ml-1' : ''}
                >
                  {formatCurrency(b.amount, locale)}
                </text>
              )}
              {/* Day label under bar */}
              <text
                x={b.x + b.w / 2}
                y={chartHeight - bottomPad + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
                className={locale === 'ar' ? 'ml-1' : ''}
              >
                {b.day.label}
              </text>
              {/* Date subtitle */}
              <text
                x={b.x + b.w / 2}
                y={chartHeight - bottomPad + 30}
                textAnchor="middle"
                fontSize="8"
                fill="#9ca3af"
                className={locale === 'ar' ? 'ml-1' : ''}
              >
                {b.day.day}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
