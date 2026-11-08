import { formatDate } from '../utils/dates';
import { useFetch } from '../utils/useFetch';
import Async from './Async';
import StatGrid from './StatGrid';

// Used for both the month-to-date and the previous-month report.
export default function PeriodReport({ id, title, load, date, refreshKey, emptyText }) {
  const state = useFetch(() => load(date), [date, refreshKey]);

  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <Async state={state}>
        {(report) => (
          <>
            <p className="muted">
              {formatDate(report.from)} to {formatDate(report.to)}
            </p>
            {report.count === 0 ? <p className="empty">{emptyText}</p> : <StatGrid report={report} />}
          </>
        )}
      </Async>
    </section>
  );
}
