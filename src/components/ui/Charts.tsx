import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// Recharts renders SVG and cannot consume Tailwind classes, so the palette is
// mirrored here. Keep these in sync with `colors` in tailwind.config.js.
const CHART = {
  primary: '#2563eb', // primary-600
  success: '#16a34a', // success-600
  error: '#ef4444', // error-500
  axis: '#94a3b8', // ink-400
  grid: '#f1f5f9', // ink-100
  border: '#e2e8f0', // ink-200
};

const axisTick = { fontSize: 12, fill: CHART.axis };
const legendStyle = { fontSize: 12 };

const tooltipStyle = {
  borderRadius: '10px', // matches borderRadius.card
  border: `1px solid ${CHART.border}`,
  boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.16)',
  fontSize: '12px',
};

/**
 * Recharts output is inert SVG to assistive technology, and these charts also encode
 * series by colour alone. Every chart therefore ships the same numbers as a
 * visually-hidden table, and the SVG itself is hidden from the accessibility tree.
 */
function ChartTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (j === 0
              ? <th key={j} scope="row">{cell}</th>
              : <td key={j}>{cell}</td>))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RevenueAreaChart({ data }: { data: { month: string; revenue: number; students: number }[] }) {
  return (
    <figure className="m-0">
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.22} />
                <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke={CHART.primary} strokeWidth={2.5} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Revenue by month"
        columns={['Month', 'Revenue', 'Students']}
        rows={data.map((row) => [row.month, `₹${row.revenue.toLocaleString('en-IN')}`, row.students])}
      />
    </figure>
  );
}

export function AttendanceBarChart({ data }: { data: { day: string; present: number; absent: number }[] }) {
  return (
    <figure className="m-0">
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
            <Bar dataKey="present" name="Present" fill={CHART.success} radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" name="Absent" fill={CHART.error} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Attendance by day"
        columns={['Day', 'Present', 'Absent']}
        rows={data.map((row) => [row.day, row.present, row.absent])}
      />
    </figure>
  );
}

export function DepartmentPieChart({ data }: { data: { name: string; students: number; color: string }[] }) {
  return (
    <figure className="m-0">
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="students" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Students by department"
        columns={['Department', 'Students']}
        rows={data.map((row) => [row.name, row.students])}
      />
    </figure>
  );
}
