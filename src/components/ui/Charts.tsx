import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 8px 24px -8px rgba(15,23,42,0.12)',
  fontSize: '12px',
};

export function RevenueAreaChart({ data }: { data: { month: string; revenue: number; students: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#revGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AttendanceBarChart({ data }: { data: { day: string; present: number; absent: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="present" name="Present" fill="#16a34a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DepartmentPieChart({ data }: { data: { name: string; students: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="students" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MiniBarChart({ data, color = '#2563eb' }: { data: { label: string; value: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
