import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { getSlotLabel } from '../utils/constants';
import { formatDate } from '../utils/dates';
import { useFetch } from '../utils/useFetch';
import Async from './Async';

const PAGE_SIZE = 10;

export default function ReadingsHistory({ refreshKey, editingId, onEdit, onDelete }) {
  const [page, setPage] = useState(1);
  const state = useFetch(
    () => api.listReadings({ page, limit: PAGE_SIZE }),
    [page, refreshKey]
  );

  // If the last reading on the final page was deleted, step back one page.
  const { data } = state;
  useEffect(() => {
    if (data && data.data.length === 0 && page > 1) setPage(page - 1);
  }, [data, page]);

  return (
    <section className="panel" aria-labelledby="history-heading">
      <h2 id="history-heading">Readings history</h2>
      <Async state={state}>
        {({ data: readings, pagination }) =>
          pagination.total === 0 ? (
            <p className="empty">You have not added any readings yet. Your history will appear here.</p>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Time slot</th>
                      <th scope="col" className="number">Glucose (mg/dl)</th>
                      <th scope="col"><span className="visually-hidden">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((reading) => (
                      <tr key={reading.id} className={reading.id === editingId ? 'is-editing' : undefined}>
                        <td className="cell-date">{formatDate(reading.reading_date)}</td>
                        <td className="cell-slot">{getSlotLabel(reading.time_slot)}</td>
                        <td className="number">
                          {reading.glucose_value}
                          <span className="unit mobile-only"> mg/dl</span>
                        </td>
                        <td className="row-actions">
                          <button
                            type="button"
                            className="button small"
                            onClick={() => onEdit(reading)}
                            aria-label={`Edit ${getSlotLabel(reading.time_slot)} reading on ${formatDate(reading.reading_date)}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="button small danger"
                            onClick={() => onDelete(reading)}
                            aria-label={`Delete ${getSlotLabel(reading.time_slot)} reading on ${formatDate(reading.reading_date)}`}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav className="pagination" aria-label="Readings pages">
                <button type="button" className="button small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <span aria-live="polite">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} readings)
                </span>
                <button
                  type="button"
                  className="button small"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </nav>
            </>
          )
        }
      </Async>
    </section>
  );
}
