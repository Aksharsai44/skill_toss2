import {
  TrendingUp, Users, Building2, Wallet, Network, Target, FileBarChart,
  MapPin, ArrowUpRight, ArrowDownRight, Download, Calendar, Filter,
} from 'lucide-react';
import { useState } from 'react';
import { PageHeader, Card, CardHeader } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { RevenueAreaChart, DepartmentPieChart, AttendanceBarChart } from '@/components/ui/Charts';
import { Select } from '@/components/ui/Tabs';
import { branches, revenueData, departmentData, attendanceData, students, teachers } from '@/lib/mockData';
import { cn } from '@/lib/cn';

export function SuperAdminDashboard() {
  const totalRevenue = branches.reduce((s, b) => s + b.revenue, 0);
  const totalStudents = branches.reduce((s, b) => s + b.students, 0);
  const totalTeachers = branches.reduce((s, b) => s + b.teachers, 0);

  return (
    <div>
      <PageHeader title="Super Admin Dashboard" subtitle="Consolidated view across all branches & departments" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={`₹${(totalRevenue / 1000).toFixed(0)}k`} icon={Wallet} trend={15} trendLabel="vs last month" color="primary" />
        <StatCard label="Total Students" value={totalStudents.toLocaleString()} icon={Users} trend={8} color="accent" />
        <StatCard label="Total Faculty" value={totalTeachers} icon={Building2} trend={4} color="success" />
        <StatCard label="Active Branches" value={branches.length} icon={Network} color="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue Across All Branches" subtitle="Monthly consolidated revenue" />
          <div className="p-5"><RevenueAreaChart data={revenueData} /></div>
        </Card>
        <Card>
          <CardHeader title="Students by Department" />
          <div className="p-5"><DepartmentPieChart data={departmentData} /></div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader title="Weekly Attendance" subtitle="Present vs absent across all branches" />
          <div className="p-5"><AttendanceBarChart data={attendanceData} /></div>
        </Card>
        <Card>
          <CardHeader title="Branch Performance" subtitle="Revenue & growth comparison" />
          <div className="p-5 space-y-3">
            {branches.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-ink-800">{b.name}</p>
                    <p className="text-sm font-semibold text-ink-900">₹{(b.revenue / 1000).toFixed(0)}k</p>
                  </div>
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full" style={{ width: `${(b.revenue / 85000) * 100}%` }} />
                  </div>
                </div>
                <span className={cn('text-xs font-semibold flex items-center gap-0.5', b.growth >= 0 ? 'text-success-600' : 'text-error-600')}>
                  {b.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(b.growth)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function Branches() {
  return (
    <div>
      <PageHeader title="Branches" subtitle="All campuses under the institution group" />
      <div className="grid sm:grid-cols-2 gap-4">
        {branches.map((b) => (
          <Card key={b.id} hover className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink-900">{b.name}</h3>
                  <p className="text-xs text-ink-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.location}</p>
                </div>
              </div>
              <span className={cn('text-sm font-semibold flex items-center gap-0.5', b.growth >= 0 ? 'text-success-600' : 'text-error-600')}>
                {b.growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {Math.abs(b.growth)}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-ink-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-ink-900">{b.students}</p>
                <p className="text-[10px] text-ink-400">Students</p>
              </div>
              <div className="bg-ink-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-ink-900">{b.teachers}</p>
                <p className="text-[10px] text-ink-400">Teachers</p>
              </div>
              <div className="bg-ink-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-ink-900">₹{(b.revenue / 1000).toFixed(0)}k</p>
                <p className="text-[10px] text-ink-400">Revenue</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Revenue() {
  const [period, setPeriod] = useState('monthly');
  return (
    <div>
      <PageHeader title="Revenue Analytics" subtitle="Detailed revenue breakdown across branches" actions={
        <Select value={period} onChange={setPeriod} options={[
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: 'yearly', label: 'Yearly' },
        ]} />
      } />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value="₹2.43L" icon={Wallet} trend={15} color="primary" />
        <StatCard label="Fee Collection" value="₹1.82L" icon={TrendingUp} trend={12} color="success" />
        <StatCard label="Pending Dues" value="₹38k" icon={Target} trend={-5} color="warning" />
        <StatCard label="Avg / Branch" value="₹60k" icon={Building2} trend={8} color="accent" />
      </div>
      <Card className="mb-6">
        <CardHeader title="Revenue Trend" subtitle={`${period} revenue across all branches`} />
        <div className="p-5"><RevenueAreaChart data={revenueData} /></div>
      </Card>
      <Card>
        <CardHeader title="Branch-wise Revenue" />
        <DataTable
          columns={[
            { key: 'name', label: 'Branch' },
            { key: 'location', label: 'Location' },
            { key: 'students', label: 'Students', render: (r) => r.students.toLocaleString() },
            { key: 'revenue', label: 'Revenue', render: (r) => `₹${(r.revenue / 1000).toFixed(0)}k` },
            { key: 'growth', label: 'Growth', render: (r) => (
              <span className={cn('font-semibold flex items-center gap-0.5', r.growth >= 0 ? 'text-success-600' : 'text-error-600')}>
                {r.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(r.growth)}%
              </span>
            ) },
          ]}
          data={branches}
        />
      </Card>
    </div>
  );
}

export function LeadsReport() {
  const leads = [
    { id: 'ld1', source: 'Website Form', count: 42, converted: 28, rate: 67 },
    { id: 'ld2', source: 'Referral', count: 18, converted: 14, rate: 78 },
    { id: 'ld3', source: 'Social Media', count: 35, converted: 19, rate: 54 },
    { id: 'ld4', source: 'Email Campaign', count: 28, converted: 12, rate: 43 },
    { id: 'ld5', source: 'Direct', count: 15, converted: 11, rate: 73 },
  ];
  return (
    <div>
      <PageHeader title="Leads Report" subtitle="Lead sources, conversion rates & pipeline analysis" actions={<button className="btn-secondary"><Download className="w-4 h-4" /> Export</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Leads" value="138" icon={Target} trend={22} color="primary" />
        <StatCard label="Converted" value="84" icon={Users} trend={18} color="success" />
        <StatCard label="Conversion Rate" value="61%" icon={TrendingUp} trend={5} color="accent" />
        <StatCard label="In Pipeline" value="54" icon={Filter} color="warning" />
      </div>
      <Card>
        <CardHeader title="Lead Sources" subtitle="Conversion by source" />
        <DataTable
          columns={[
            { key: 'source', label: 'Source', render: (r) => <span className="font-medium text-ink-800">{r.source}</span> },
            { key: 'count', label: 'Total Leads' },
            { key: 'converted', label: 'Converted' },
            { key: 'rate', label: 'Conversion Rate', render: (r) => (
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-success-500 rounded-full" style={{ width: `${r.rate}%` }} />
                </div>
                <span className="text-sm font-medium text-ink-700">{r.rate}%</span>
              </div>
            ) },
          ]}
          data={leads}
        />
      </Card>
    </div>
  );
}

export function ConsolidatedReports() {
  const [reportType, setReportType] = useState('students');
  return (
    <div>
      <PageHeader title="Consolidated Reports" subtitle="Cross-branch reports for students, faculty & finance" actions={
        <>
          <Select value={reportType} onChange={setReportType} options={[
            { value: 'students', label: 'Student Report' },
            { value: 'faculty', label: 'Faculty Report' },
            { value: 'finance', label: 'Finance Report' },
          ]} />
          <button className="btn-primary"><Download className="w-4 h-4" /> Download</button>
        </>
      } />
      {reportType === 'students' && (
        <Card>
          <CardHeader title="Student Report" subtitle="All students across branches" />
          <DataTable
            columns={[
              { key: 'name', label: 'Student', render: (s) => (
                <div className="flex items-center gap-2">
                  <img src={s.avatar} alt={s.name} className="w-7 h-7 rounded-lg bg-ink-100" />
                  <span className="font-medium text-ink-800">{s.name}</span>
                </div>
              ) },
              { key: 'batch', label: 'Batch' },
              { key: 'department', label: 'Department' },
              { key: 'attendance', label: 'Attendance', render: (s) => `${s.attendance}%` },
              { key: 'feePaid', label: 'Fee Paid', render: (s) => `₹${(s.feePaid / 1000).toFixed(0)}k / ₹${(s.feeTotal / 1000).toFixed(0)}k` },
              { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            ]}
            data={students}
          />
        </Card>
      )}
      {reportType === 'faculty' && (
        <Card>
          <CardHeader title="Faculty Report" subtitle="All teachers across branches" />
          <DataTable
            columns={[
              { key: 'name', label: 'Teacher', render: (t) => (
                <div className="flex items-center gap-2">
                  <img src={t.avatar} alt={t.name} className="w-7 h-7 rounded-lg bg-ink-100" />
                  <span className="font-medium text-ink-800">{t.name}</span>
                </div>
              ) },
              { key: 'subjects', label: 'Subjects', render: (t) => t.subjects.join(', ') },
              { key: 'batches', label: 'Batches', render: (t) => t.batches.join(', ') },
              { key: 'attendance', label: 'Attendance', render: (t) => `${t.attendance}%` },
              { key: 'salary', label: 'Salary', render: (t) => `₹${(t.salary / 1000).toFixed(0)}k` },
              { key: 'status', label: 'Status', render: (t) => <StatusBadge status={t.status} /> },
            ]}
            data={teachers}
          />
        </Card>
      )}
      {reportType === 'finance' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Collected" value="₹1.82L" icon={Wallet} color="success" />
          <StatCard label="Total Pending" value="₹38k" icon={Target} color="warning" />
          <StatCard label="Salary Paid" value="₹2.55L" icon={Wallet} color="primary" />
          <StatCard label="Net Profit" value="₹1.20L" icon={TrendingUp} trend={18} color="accent" />
        </div>
      )}
    </div>
  );
}
