import { useState } from 'react';
import { api } from '../api/client';
import DailyReport from '../components/DailyReport';
import GlucoseChart from '../components/GlucoseChart';
import PeriodReport from '../components/PeriodReport';
import ReadingForm from '../components/ReadingForm';
import ReadingsHistory from '../components/ReadingsHistory';
import { useAuth } from '../context/AuthContext';
import { getSlotLabel } from '../utils/constants';
import { formatDate, getToday } from '../utils/dates';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const today = getToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [editingReading, setEditingReading] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState(null);

  function refreshData() {
    setRefreshKey((key) => key + 1);
  }

  function handleDateChange(event) {
    if (event.target.value) setSelectedDate(event.target.value);
  }

  async function saveReading(payload) {
    if (editingReading) {
      await api.updateReading(editingReading.id, payload);
      setEditingReading(null);
      setNotice({ type: 'success', text: 'Reading updated.' });
    } else {
      await api.createReading(payload);
      setNotice({ type: 'success', text: 'Reading saved.' });
    }
    refreshData();
  }

  function startEditing(reading) {
    setNotice(null);
    setEditingReading(reading);
    document.getElementById('reading-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function deleteReading(reading) {
    const description = `${getSlotLabel(reading.time_slot)} reading on ${formatDate(reading.reading_date)}`;
    if (!window.confirm(`Delete the ${description}? This cannot be undone.`)) return;

    try {
      await api.deleteReading(reading.id);
      if (editingReading?.id === reading.id) setEditingReading(null);
      setNotice({ type: 'success', text: 'Reading deleted.' });
      refreshData();
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="container header-inner">
          <p className="brand">Sweety</p>
          <div className="header-user">
            <span>{user.name}</span>
            <button type="button" className="button small" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="container dashboard">
        <div className="toolbar">
          <h1>Dashboard</h1>
          <div className="date-picker">
            <label htmlFor="report-date">Report date</label>
            <input id="report-date" type="date" max={today} value={selectedDate} onChange={handleDateChange} />
            <button type="button" className="button small" onClick={() => setSelectedDate(today)} disabled={selectedDate === today}>
              Today
            </button>
          </div>
        </div>

        {notice && (
          <p className={`message ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}

        <div className="grid two-columns">
          <ReadingForm
            key={editingReading ? `edit-${editingReading.id}` : `add-${selectedDate}`}
            reading={editingReading}
            defaultDate={selectedDate}
            onSubmit={saveReading}
            onCancel={() => setEditingReading(null)}
            loadDayReadings={async (date) => (await api.listReadings({ date, limit: 10 })).data}
          />
          <DailyReport date={selectedDate} refreshKey={refreshKey} />
        </div>

        <div className="grid two-columns">
          <PeriodReport
            id="mtd-heading"
            title="Month to date"
            load={api.getMonthToDateReport}
            date={selectedDate}
            refreshKey={refreshKey}
            emptyText="No readings so far this month."
          />
          <PeriodReport
            id="previous-heading"
            title="Previous month"
            load={api.getMonthlyReport}
            date={selectedDate}
            refreshKey={refreshKey}
            emptyText="No readings in the previous month."
          />
        </div>

        <GlucoseChart date={selectedDate} refreshKey={refreshKey} />
        <ReadingsHistory refreshKey={refreshKey} editingId={editingReading?.id} onEdit={startEditing} onDelete={deleteReading} />
      </main>
    </>
  );
}
