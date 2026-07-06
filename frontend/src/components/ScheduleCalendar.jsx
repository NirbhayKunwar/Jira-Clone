import { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, Trash2, AlignLeft, Info } from 'lucide-react';
import { API_URL, getAuthHeaders } from '../config/api';

export default function ScheduleCalendar({ activeWorkspace }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Form States
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  useEffect(() => {
    if (!activeWorkspace?.id) return;

    const controller = new AbortController();

    const loadEvents = async () => {
      try {
        const response = await fetch(`${API_URL}/api/schedule-events?workspaceId=${activeWorkspace.id}`, {
          headers: getAuthHeaders(),
          signal: controller.signal
        });
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
          setError('');
        } else {
          setError('Failed to fetch scheduled events.');
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Fetch events error:', err);
        setError('Error connecting to backend database.');
      }
    };

    loadEvents();
    return () => controller.abort();
  }, [activeWorkspace?.id]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstDayIndex = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  const daysArray = useMemo(() => {
    const arr = [];
    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      arr.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      arr.push({ day: i, isCurrentMonth: true });
    }
    // Next month padding to complete 6 weeks (42 cells)
    const remainingCells = 42 - arr.length;
    for (let i = 1; i <= remainingCells; i++) {
      arr.push({ day: i, isCurrentMonth: false });
    }
    return arr;
  }, [year, month, daysInMonth, firstDayIndex]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenAddModal = (dayNum) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    setEventTitle('');
    setEventDesc('');
    setStartTime('09:00');
    setEndTime('10:00');
    setShowAddModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/schedule-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          title: eventTitle.trim(),
          desc: eventDesc.trim(),
          eventDate: selectedDateStr,
          startTime,
          endTime,
          workspaceId: activeWorkspace.id
        })
      });

      if (response.ok) {
        const newEv = await response.json();
        setEvents(prev => [...prev, newEv]);
        setShowAddModal(false);
      } else {
        alert('Failed to save event.');
      }
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Error saving event to database.');
    }
  };

  const handleOpenViewModal = (event, e) => {
    e.stopPropagation(); // prevent opening Add modal
    setSelectedEvent(event);
    setShowViewModal(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (!window.confirm(`Delete event "${selectedEvent.title}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/schedule-events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setEvents(prev => prev.filter(ev => ev.id !== selectedEvent.id));
        setShowViewModal(false);
      } else {
        alert('Failed to delete event.');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Error connecting to backend to delete event.');
    }
  };

  const isToday = (dayNum, isCurrMonth) => {
    if (!isCurrMonth) return false;
    const today = new Date();
    return today.getDate() === dayNum && today.getMonth() === month && today.getFullYear() === year;
  };

  return (
    <div className="space-y-6 animate-[fade-in_200ms_ease-out]">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card-secondary p-4 rounded-xl border border-border-secondary/40 shadow-sm">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="w-5 h-5 text-accent" />
          <h3 className="font-display font-extrabold text-text-secondary text-base leading-none">
            {monthNames[month]} {year}
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg border border-border-secondary/60 hover:bg-dominant-offset text-xs font-bold text-text-secondary transition-colors cursor-pointer bg-transparent"
          >
            Today
          </button>
          <div className="flex items-center border border-border-secondary/60 rounded-lg overflow-hidden">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-dominant-offset text-text-secondary border-none bg-transparent cursor-pointer flex items-center justify-center"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border-secondary/60" />
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-dominant-offset text-text-secondary border-none bg-transparent cursor-pointer flex items-center justify-center"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-500 rounded-lg flex items-center space-x-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-card-secondary rounded-xl border border-border-secondary/65 shadow-sm overflow-hidden flex flex-col">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-border-secondary/40 bg-dominant-offset/20 text-center py-2 text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 grid-rows-6 auto-rows-fr divide-x divide-y divide-border-secondary/35 min-h-[480px]">
          {daysArray.map((cell, idx) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
            const dayEvents = cell.isCurrentMonth
              ? events.filter(e => e.eventDate === dateStr)
              : [];

            return (
              <div
                key={idx}
                onClick={() => cell.isCurrentMonth && handleOpenAddModal(cell.day)}
                className={`p-1.5 flex flex-col group min-h-[85px] relative transition-colors ${
                  cell.isCurrentMonth 
                    ? 'bg-transparent hover:bg-dominant-offset/20 cursor-pointer' 
                    : 'bg-dominant-offset/5 text-text-secondary-muted/40'
                }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday(cell.day, cell.isCurrentMonth)
                        ? 'bg-accent text-white shadow-sm'
                        : cell.isCurrentMonth
                          ? 'text-text-secondary'
                          : 'text-text-secondary-muted/40'
                    }`}
                  >
                    {cell.day}
                  </span>
                  
                  {cell.isCurrentMonth && (
                    <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-accent transition-opacity duration-150 mr-1" />
                  )}
                </div>

                {/* Events list container */}
                <div className="mt-1 flex-grow space-y-1 overflow-y-auto max-h-[70px] custom-scrollbar">
                  {dayEvents.map(ev => (
                    <div
                      key={ev.id}
                      onClick={(e) => handleOpenViewModal(ev, e)}
                      className="px-2 py-0.5 rounded text-[9px] font-bold truncate transition-all bg-accent/10 hover:bg-accent/25 border-l-2 border-accent text-accent select-none"
                      title={ev.title}
                    >
                      {ev.startTime ? `${ev.startTime} ` : ''}{ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-[fade-in_150ms_ease-out]">
          <div className="w-full max-w-md bg-card-secondary rounded-2xl shadow-xl border border-border-secondary/60 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent to-accent-hover" />
            
            <div className="px-6 py-5 border-b border-border-secondary/40 flex justify-between items-center mt-1.5">
              <h3 className="font-display font-extrabold text-sm text-text-secondary">Schedule New Event</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-text-secondary-muted hover:text-text-secondary p-1 rounded-lg hover:bg-dominant-offset cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary-muted uppercase mb-1.5">Date</label>
                <input
                  type="text"
                  disabled
                  value={selectedDateStr}
                  className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant-offset/40 text-text-secondary-muted focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1.5 uppercase">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Sprint Backlog Refinement"
                  className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary mb-1.5 uppercase">Start Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-secondary-muted pointer-events-none" />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary mb-1.5 uppercase">End Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-secondary-muted pointer-events-none" />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full text-xs pl-10 pr-3 py-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1.5 uppercase">Description</label>
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Add details, agendas or meeting links..."
                  className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent h-20 resize-none"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-border-secondary/40">
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg cursor-pointer border-none shadow-sm"
                >
                  Save Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Event Modal */}
      {showViewModal && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-[fade-in_150ms_ease-out]">
          <div className="w-full max-w-md bg-card-secondary rounded-2xl shadow-xl border border-border-secondary/60 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent to-accent-hover" />
            
            <div className="px-6 py-5 border-b border-border-secondary/40 flex justify-between items-center mt-1.5">
              <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-accent/10 border border-accent/20 text-accent uppercase tracking-wider">
                Scheduled Event
              </span>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-text-secondary-muted hover:text-text-secondary p-1 rounded-lg hover:bg-dominant-offset cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-left">
              <div>
                <h4 className="font-display font-extrabold text-base text-text-secondary leading-snug">
                  {selectedEvent.title}
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-b border-border-secondary/30 py-3 text-xs">
                <div className="flex items-center space-x-2.5 text-text-secondary-muted">
                  <CalendarIcon className="w-4 h-4 text-accent" />
                  <div>
                    <span className="block text-[8px] font-bold uppercase tracking-wide">Date</span>
                    <span className="font-semibold text-text-secondary">{selectedEvent.eventDate}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 text-text-secondary-muted">
                  <Clock className="w-4 h-4 text-accent" />
                  <div>
                    <span className="block text-[8px] font-bold uppercase tracking-wide">Time Slot</span>
                    <span className="font-semibold text-text-secondary">
                      {selectedEvent.startTime || '00:00'} - {selectedEvent.endTime || '00:00'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedEvent.desc && (
                <div className="space-y-1.5">
                  <span className="flex items-center text-[8px] font-bold text-text-secondary-muted uppercase tracking-wider">
                    <AlignLeft className="w-3 h-3 mr-1.5" />
                    <span>Description</span>
                  </span>
                  <p className="text-xs text-text-secondary bg-dominant/30 p-3 rounded-lg border border-border-secondary/25 leading-relaxed whitespace-pre-wrap">
                    {selectedEvent.desc}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border-secondary/40">
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  className="flex items-center space-x-1.5 px-3 py-2 border border-red-500/35 hover:bg-red-500/5 text-red-500 rounded-lg text-xs font-bold transition-all cursor-pointer bg-transparent"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-dominant-offset text-text-secondary text-xs font-bold rounded-lg cursor-pointer border border-border-secondary/60 hover:bg-dominant-offset-hover transition-colors"
                >
                  Close View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
