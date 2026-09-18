import React, { useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export default function DateRibbon({ selectedDate, onSelectDate }) {
  const dateInputRef = useRef(null);

  // Helper for today's YYYY-MM-DD
  const today = new Date();
  const getTodayStr = () => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayStr = getTodayStr();

  // Helper to add/subtract days
  const shiftDate = (dateStr, days) => {
    if (!dateStr) return todayStr;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const ny = dt.getFullYear();
    const nm = String(dt.getMonth() + 1).padStart(2, '0');
    const nd = String(dt.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  };

  // Format date display: e.g. "Fri, 18 Sep 2026"
  const formatDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDate();
    const month = dt.toLocaleDateString('en-US', { month: 'short' });
    const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' });
    const year = dt.getFullYear();
    return `${weekday}, ${day} ${month} ${year}`;
  };

  const isToday = selectedDate === todayStr;

  // Open calendar picker directly
  const handleOpenPicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        try {
          dateInputRef.current.showPicker();
          return;
        } catch (err) {
          // fallback
        }
      }
      dateInputRef.current.focus();
    }
  };

  // Format short label for pills
  const formatShort = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDate();
    const month = dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return `${day} ${month}`;
  };

  // Quick preset pills: Today, Yesterday, 2 days ago, 3 days ago
  const quickPresets = [
    { label: 'Today', dateStr: todayStr },
    { label: 'Yesterday', dateStr: shiftDate(todayStr, -1) },
    { label: formatShort(shiftDate(todayStr, -2)), dateStr: shiftDate(todayStr, -2) },
    { label: formatShort(shiftDate(todayStr, -3)), dateStr: shiftDate(todayStr, -3) }
  ];

  const isCustomSelected = !quickPresets.some((p) => p.dateStr === selectedDate);

  return (
    <div className="date-selector-wrapper">
      {/* Top Bar: Navigation Arrows + Main Date Picker Button */}
      <div className="date-selector-bar">
        <button
          type="button"
          onClick={() => onSelectDate(shiftDate(selectedDate, -1))}
          className="date-nav-arrow-btn"
          title="Previous Day"
          aria-label="Previous Day"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Center Date Trigger Button */}
        <div
          className="date-picker-trigger"
          onClick={handleOpenPicker}
          title="Click to open calendar and select any date"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpenPicker();
            }
          }}
        >
          <Calendar size={16} className="date-cal-icon" />
          <span className="date-display-label">{formatDisplay(selectedDate)}</span>
          {isToday && <span className="date-today-tag">TODAY</span>}
          <ChevronDown size={14} className="date-dropdown-icon" />

          {/* Native input that opens browser calendar picker */}
          <input
            ref={dateInputRef}
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) onSelectDate(e.target.value);
            }}
            onClick={(e) => {
              e.stopPropagation();
              try {
                if (typeof e.target.showPicker === 'function') {
                  e.target.showPicker();
                }
              } catch (err) {}
            }}
            className="date-hidden-input"
            aria-label="Select Date from Calendar"
          />
        </div>

        <button
          type="button"
          onClick={() => onSelectDate(shiftDate(selectedDate, 1))}
          className="date-nav-arrow-btn"
          title="Next Day"
          aria-label="Next Day"
        >
          <ChevronRight size={18} />
        </button>

        {!isToday && (
          <button
            type="button"
            onClick={() => onSelectDate(todayStr)}
            className="date-jump-today-btn"
            title="Jump to Today"
          >
            Today
          </button>
        )}
      </div>

      {/* Quick Date Chips Bar */}
      <div className="date-quick-chips">
        <span className="date-quick-chips-label">Quick:</span>
        {quickPresets.map((p) => {
          const isActive = selectedDate === p.dateStr;
          return (
            <button
              key={p.dateStr}
              type="button"
              onClick={() => onSelectDate(p.dateStr)}
              className={`date-quick-chip ${isActive ? 'active' : ''}`}
            >
              {p.label}
            </button>
          );
        })}

        {isCustomSelected && (
          <button
            type="button"
            className="date-quick-chip active"
            title="Custom picked date"
          >
            {formatShort(selectedDate)} (Selected)
          </button>
        )}
      </div>
    </div>
  );
}
