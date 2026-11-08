import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api } from '../api/client';
import { TIME_SLOTS } from '../utils/constants';
import { formatMonth } from '../utils/dates';
import { buildChartData } from '../utils/chartData';
import { useFetch } from '../utils/useFetch';
import Async from './Async';

const SLOT_COLORS = {
  morning: '#0b6e6a',
  after_breakfast: '#c2570c',
  after_lunch: '#5b4bb7',
  after_dinner: '#b0306b',
};

export default function GlucoseChart({ date, refreshKey }) {
  const month = date.slice(0, 7);
  const state = useFetch(() => api.getChartData(month), [month, refreshKey]);

  return (
    <section className="panel" aria-labelledby="chart-heading">
      <h2 id="chart-heading">Monthly chart</h2>
      <p className="muted">{formatMonth(month)}</p>
      <Async state={state}>
        {(chart) =>
          chart.readings.length === 0 ? (
            <p className="empty">No readings in {formatMonth(month)}, so there is nothing to plot yet.</p>
          ) : (
            <div className="chart" role="img" aria-label={`Line chart of glucose readings for ${formatMonth(month)}`}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={buildChartData(month, chart.readings)} margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
                  <CartesianGrid stroke="#e3eaeb" vertical={false} />
                  <XAxis dataKey="day" tickMargin={6} label={{ value: 'Day of month', position: 'insideBottom', offset: -12, fontSize: 12 }} />
                  <YAxis
                    domain={[
                      (min) => Math.max(0, Math.floor((min - 10) / 10) * 10),
                      (max) => Math.ceil((max + 10) / 10) * 10,
                    ]}
                    width={48}
                    label={{ value: 'mg/dl', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <Tooltip labelFormatter={(day) => `${day} ${formatMonth(month)}`} formatter={(value) => [`${value} mg/dl`]} />
                  <Legend verticalAlign="top" itemSorter={null} wrapperStyle={{ paddingBottom: 8 }} />
                  {TIME_SLOTS.map((slot) => (
                    <Line
                      key={slot.value}
                      type="linear"
                      dataKey={slot.value}
                      name={slot.label}
                      stroke={SLOT_COLORS[slot.value]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )
        }
      </Async>
    </section>
  );
}
