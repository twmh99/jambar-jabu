import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

/**
 * Grafik gabungan Bar + Line
 * data: [{ week: 'M1', attendance: 85, productivity: 80 }, ...]
 */
export function BarLineCombo({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="attendance"
          name="Kehadiran (%)"
          fill="hsl(var(--primary))"
          radius={[6, 6, 0, 0]}
          barSize={30}
        />
        <Line
          type="monotone"
          dataKey="productivity"
          name="Produktivitas (%)"
          stroke="hsl(var(--accent))"
          strokeWidth={3}
          dot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
