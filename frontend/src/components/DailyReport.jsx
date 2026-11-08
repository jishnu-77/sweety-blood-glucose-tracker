import { api } from '../api/client';
import { getSlotLabel } from '../utils/constants';
import { formatLongDate } from '../utils/dates';
import { useFetch } from '../utils/useFetch';
import Async from './Async';
import StatGrid from './StatGrid';

export default function DailyReport({ date, refreshKey }) {
  const state = useFetch(() => api.getDailyReport(date), [date, refreshKey]);

  return (
    <section className="panel" aria-labelledby="daily-heading">
      <h2 id="daily-heading">Daily report</h2>
      <p className="muted">{formatLongDate(date)}</p>
      <Async state={state}>
        {(report) =>
          report.count === 0 ? (
            <p className="empty">No readings for this day yet. Add one using the form.</p>
          ) : (
            <>
              <StatGrid report={report} />
              <ul className="reading-list">
                {report.readings.map((reading) => (
                  <li key={reading.id}>
                    <span>{getSlotLabel(reading.time_slot)}</span>
                    <strong>{reading.glucose_value} mg/dl</strong>
                  </li>
                ))}
              </ul>
            </>
          )
        }
      </Async>
    </section>
  );
}
