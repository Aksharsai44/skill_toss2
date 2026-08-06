import { useState, useEffect, useCallback } from 'react';
import {
  Users, Wallet, TrendingUp, GraduationCap, Layers, CreditCard, Fingerprint,
  CalendarOff, CalendarDays, Plug, Award, Calendar, Plus, Search, Download,
  Check, X, MessageCircle, Mail, Smartphone, Video, Settings, Send,
  BookOpen, Upload, Clock, MapPin, Phone, ChevronRight, DollarSign,
} from 'lucide-react';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs, Select } from '@/components/ui/Tabs';
import { RevenueAreaChart, AttendanceBarChart, DepartmentPieChart } from '@/components/ui/Charts';
import { supabase } from '@/lib/supabase';
import { CourseBuilder } from '@/components/CourseBuilder';
import {
  students, teachers, batches, feeRecords, leaveRequests, events,
  salaryRecords, messages, revenueData, attendanceData, departmentData,
} from '@/lib/mockData';
import type { Student, Teacher, FeeRecord, LeaveRequest } from '@/lib/types';
import { cn } from '@/lib/cn';

export function AdminDashboard() {
  const totalFees = feeRecords.reduce((s, f) => s + f.total, 0);
  const collectedFees = feeRecords.reduce((s, f) => s + f.paid, 0);
  const pendingFees = feeRecords.reduce((s, f) => s + f.pending, 0);
  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Bright Future College — overview of students, fees, faculty & operations" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={students.length * 40} icon={Users} trend={6} color="primary" />
        <StatCard label="Total Faculty" value={teachers.length * 10} icon={GraduationCap} color="accent" />
        <StatCard label="Fees Collected" value={`₹${(collectedFees / 1000).toFixed(0)}k`} icon={CreditCard} trend={12} color="success" />
        <StatCard label="Pending Fees" value={`₹${(pendingFees / 1000).toFixed(0)}k`} icon={Wallet} trend={-3} color="warning" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue & Fee Collection" />
          <div className="p-5"><RevenueAreaChart data={revenueData} /></div>
        </Card>
        <Card>
          <CardHeader title="Department Distribution" />
          <div className="p-5"><DepartmentPieChart data={departmentData} /></div>
        </Card>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Weekly Attendance" />
          <div className="p-5"><AttendanceBarChart data={attendanceData} /></div>
        </Card>
        <Card>
          <CardHeader title="Pending Approvals" subtitle="Leave requests awaiting action" />
          <div className="p-3 space-y-2">
            {leaveRequests.filter((l) => l.status === 'pending').map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50">
                <div className="w-9 h-9 rounded-lg bg-warning-50 flex items-center justify-center"><CalendarOff className="w-4 h-4 text-warning-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800">{l.student}</p>
                  <p className="text-xs text-ink-400">{l.from} → {l.to} · {l.reason}</p>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg bg-success-50 text-success-600 hover:bg-success-100"><Check className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded-lg bg-error-50 text-error-600 hover:bg-error-100"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function AdminTeachers() {
  const [selected, setSelected] = useState<Teacher | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <PageHeader title="Teachers & Mentors" subtitle="Manage faculty members, subjects & batches" actions={
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input placeholder="Search teachers..." className="pl-9 pr-4 py-2.5 text-sm bg-white border border-ink-200 rounded-xl focus:outline-none focus:border-primary-500 w-48" />
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Teacher</button>
        </>
      } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((t) => (
          <button key={t.id} onClick={() => setSelected(t)} className="card card-hover p-5 text-left">
            <div className="flex items-center gap-3 mb-4">
              <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-xl bg-ink-100" />
              <div>
                <h3 className="font-semibold text-ink-900">{t.name}</h3>
                <p className="text-xs text-ink-400">{t.subjects.join(', ')}</p>
              </div>
              <div className="ml-auto"><StatusBadge status={t.status} /></div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-ink-500"><Mail className="w-3.5 h-3.5" /> {t.email}</div>
              <div className="flex items-center gap-2 text-ink-500"><Phone className="w-3.5 h-3.5" /> {t.phone}</div>
              <div className="flex items-center gap-2 text-ink-500"><Layers className="w-3.5 h-3.5" /> {t.batches.join(', ')}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-ink-100 flex justify-between text-sm">
              <span className="text-ink-400">Salary: <span className="font-semibold text-ink-800">₹{(t.salary / 1000).toFixed(0)}k</span></span>
              <span className="text-ink-400">Attendance: <span className="font-semibold text-ink-800">{t.attendance}%</span></span>
            </div>
          </button>
        ))}
      </div>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Teacher Profile" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img src={selected.avatar} alt={selected.name} className="w-16 h-16 rounded-xl bg-ink-100" />
              <div>
                <h3 className="text-xl font-bold font-display text-ink-900">{selected.name}</h3>
                <p className="text-sm text-ink-500">{selected.subjects.join(', ')}</p>
                <div className="mt-1"><StatusBadge status={selected.status} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="card p-3"><p className="text-ink-400 text-xs">Email</p><p className="font-medium text-ink-800">{selected.email}</p></div>
              <div className="card p-3"><p className="text-ink-400 text-xs">Phone</p><p className="font-medium text-ink-800">{selected.phone}</p></div>
              <div className="card p-3"><p className="text-ink-400 text-xs">Salary</p><p className="font-medium text-ink-800">₹{(selected.salary / 1000).toFixed(0)}k/month</p></div>
              <div className="card p-3"><p className="text-ink-400 text-xs">Attendance</p><p className="font-medium text-ink-800">{selected.attendance}%</p></div>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-700 mb-2">Assigned Batches</p>
              <div className="flex flex-wrap gap-2">{selected.batches.map((b) => <Badge key={b} variant="primary">{b}</Badge>)}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1">Edit Profile</button>
              <button className="btn-secondary"><MessageCircle className="w-4 h-4" /> Message</button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Teacher" size="md">
        <div className="space-y-4">
          <div><label className="label">Full Name</label><input className="input" placeholder="Enter teacher name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email</label><input className="input" placeholder="email@school.edu" /></div>
            <div><label className="label">Phone</label><input className="input" placeholder="+91 98765 43210" /></div>
          </div>
          <div><label className="label">Subjects</label><input className="input" placeholder="Data Structures, Algorithms" /></div>
          <div><label className="label">Assign Batches</label><input className="input" placeholder="CS-2024-A" /></div>
          <div><label className="label">Monthly Salary (₹)</label><input className="input" type="number" placeholder="50000" /></div>
          <button onClick={() => setShowAdd(false)} className="btn-primary w-full">Create Teacher</button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminStudents() {
  const [selected, setSelected] = useState<Student | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <PageHeader title="Students" subtitle="Manage student profiles, batches & fee status" actions={
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input placeholder="Search students..." className="pl-9 pr-4 py-2.5 text-sm bg-white border border-ink-200 rounded-xl focus:outline-none focus:border-primary-500 w-48" />
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Student</button>
        </>
      } />
      <Card>
        <DataTable<Student>
          columns={[
            { key: 'name', label: 'Student', render: (s) => (
              <div className="flex items-center gap-3">
                <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-lg bg-ink-100" />
                <div>
                  <p className="font-medium text-ink-800">{s.name}</p>
                  <p className="text-xs text-ink-400">{s.rollNo}</p>
                </div>
              </div>
            ) },
            { key: 'batch', label: 'Batch' },
            { key: 'department', label: 'Department' },
            { key: 'attendance', label: 'Attendance', render: (s) => (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', s.attendance >= 75 ? 'bg-success-500' : 'bg-error-500')} style={{ width: `${s.attendance}%` }} />
                </div>
                <span className="text-xs text-ink-600">{s.attendance}%</span>
              </div>
            ) },
            { key: 'fee', label: 'Fee Status', render: (s) => {
              const pct = (s.feePaid / s.feeTotal) * 100;
              return <span className={cn('text-xs font-medium', pct === 100 ? 'text-success-600' : pct > 0 ? 'text-warning-600' : 'text-error-600')}>
                ₹{(s.feePaid / 1000).toFixed(0)}k / ₹{(s.feeTotal / 1000).toFixed(0)}k
              </span>;
            } },
            { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s.status} /> },
          ]}
          data={students}
          onRowClick={setSelected}
        />
      </Card>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Student Profile" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img src={selected.avatar} alt={selected.name} className="w-16 h-16 rounded-xl bg-ink-100" />
              <div>
                <h3 className="text-xl font-bold font-display text-ink-900">{selected.name}</h3>
                <p className="text-sm text-ink-500">{selected.rollNo} · {selected.department}</p>
                <div className="mt-1 flex gap-2"><Badge variant="primary">{selected.batch}</Badge><StatusBadge status={selected.status} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="card p-3"><p className="text-ink-400 text-xs">Email</p><p className="font-medium text-ink-800">{selected.email}</p></div>
              <div className="card p-3"><p className="text-ink-400 text-xs">Phone</p><p className="font-medium text-ink-800">{selected.phone}</p></div>
              <div className="card p-3"><p className="text-ink-400 text-xs">Parent Phone</p><p className="font-medium text-ink-800">{selected.parentPhone}</p></div>
              <div className="card p-3"><p className="text-ink-400 text-xs">Attendance</p><p className="font-medium text-ink-800">{selected.attendance}%</p></div>
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-ink-700">Fee Details</p>
                <Badge variant={selected.feePaid >= selected.feeTotal ? 'success' : selected.feePaid > 0 ? 'warning' : 'error'}>
                  {selected.feePaid >= selected.feeTotal ? 'Fully Paid' : 'Pending'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Paid: ₹{selected.feePaid.toLocaleString()}</span>
                <span className="text-ink-500">Total: ₹{selected.feeTotal.toLocaleString()}</span>
                <span className="font-semibold text-error-600">Pending: ₹{(selected.feeTotal - selected.feePaid).toLocaleString()}</span>
              </div>
              <div className="mt-2 h-2 bg-ink-100 rounded-full overflow-hidden">
                <div className="h-full bg-success-500 rounded-full" style={{ width: `${(selected.feePaid / selected.feeTotal) * 100}%` }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1"><Download className="w-4 h-4" /> Download Report</button>
              <button className="btn-secondary"><MessageCircle className="w-4 h-4" /> WhatsApp Parent</button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Student" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Full Name</label><input className="input" placeholder="Student name" /></div>
            <div><label className="label">Roll Number</label><input className="input" placeholder="BFC-CS-09" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email</label><input className="input" placeholder="email@student.com" /></div>
            <div><label className="label">Phone</label><input className="input" placeholder="+91 98765 43210" /></div>
          </div>
          <div><label className="label">Parent Phone</label><input className="input" placeholder="+91 98765 43211" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Batch</label>
              <Select value="" onChange={() => {}} options={batches.map((b) => ({ value: b.id, label: b.name }))} />
            </div>
            <div><label className="label">Total Fee (₹)</label><input className="input" type="number" placeholder="45000" /></div>
          </div>
          <button onClick={() => setShowAdd(false)} className="btn-primary w-full">Create Student</button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminBatches() {
  return (
    <div>
      <PageHeader title="Batches & Departments" subtitle="Manage class batches, schedules & assignments" actions={<button className="btn-primary"><Plus className="w-4 h-4" /> Create Batch</button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map((b) => (
          <Card key={b.id} hover className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white">
                <Layers className="w-5 h-5" />
              </div>
              <Badge variant="primary">{b.department}</Badge>
            </div>
            <h3 className="font-semibold text-ink-900">{b.name}</h3>
            <p className="text-xs text-ink-400 mb-3">{b.schedule}</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Students</span>
                <span className="font-semibold text-ink-800">{b.strength}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500 flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Teacher</span>
                <span className="font-medium text-ink-700 text-xs">{b.teacher}</span>
              </div>
            </div>
            <button className="btn-secondary w-full mt-4 text-sm">Manage Batch</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminFees() {
  const [tab, setTab] = useState(0);
  const [showPay, setShowPay] = useState<FeeRecord | null>(null);
  const pending = feeRecords.filter((f) => f.status !== 'paid');
  const overdue = feeRecords.filter((f) => f.status === 'overdue');
  const totalPending = feeRecords.reduce((s, f) => s + f.pending, 0);
  return (
    <div>
      <PageHeader title="Fee Management" subtitle="Track, collect & analyze fees with auto-reminders via WhatsApp & email" actions={<button className="btn-secondary"><Download className="w-4 h-4" /> Export</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Fees" value={`₹${(feeRecords.reduce((s, f) => s + f.total, 0) / 1000).toFixed(0)}k`} icon={CreditCard} color="primary" />
        <StatCard label="Collected" value={`₹${(feeRecords.reduce((s, f) => s + f.paid, 0) / 1000).toFixed(0)}k`} icon={TrendingUp} trend={12} color="success" />
        <StatCard label="Pending" value={`₹${(totalPending / 1000).toFixed(0)}k`} icon={Wallet} color="warning" />
        <StatCard label="Overdue" value={overdue.length} icon={Clock} color="error" />
      </div>
      <Card>
        <Tabs
          defaultIndex={tab}
          tabs={[
            { label: 'All Records', content: <FeeTable data={feeRecords} onPay={setShowPay} /> },
            { label: `Pending (${pending.length})`, content: <FeeTable data={pending} onPay={setShowPay} /> },
            { label: `Overdue (${overdue.length})`, content: <FeeTable data={overdue} onPay={setShowPay} /> },
          ]}
        />
      </Card>
      <Modal open={!!showPay} onClose={() => setShowPay(null)} title="Collect Fee Payment" size="md">
        {showPay && (
          <div className="space-y-4">
            <div className="card p-4 bg-ink-50">
              <p className="text-sm text-ink-500">Student</p>
              <p className="font-semibold text-ink-900">{showPay.student}</p>
              <p className="text-xs text-ink-400">{showPay.batch} · {showPay.term}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="card p-3"><p className="text-ink-400 text-xs">Total Fee</p><p className="font-semibold text-ink-900">₹{showPay.total.toLocaleString()}</p></div>
              <div className="card p-3"><p className="text-ink-400 text-xs">Already Paid</p><p className="font-semibold text-success-600">₹{showPay.paid.toLocaleString()}</p></div>
              <div className="card p-3"><p className="text-ink-400 text-xs">Pending</p><p className="font-semibold text-error-600">₹{showPay.pending.toLocaleString()}</p></div>
              <div className="card p-3"><p className="text-ink-400 text-xs">Due Date</p><p className="font-semibold text-ink-900">{showPay.dueDate}</p></div>
            </div>
            <div><label className="label">Payment Method</label>
              <Select value="razorpay" onChange={() => {}} options={[
                { value: 'razorpay', label: 'Razorpay (Online)' },
                { value: 'cash', label: 'Cash (Manual Entry)' },
                { value: 'bank', label: 'Bank Transfer' },
              ]} />
            </div>
            <div><label className="label">Amount to Collect (₹)</label><input className="input" type="number" defaultValue={showPay.pending} /></div>
            <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
              <MessageCircle className="w-4 h-4" /> Auto-send invoice to parent via WhatsApp & email after payment
            </div>
            <button onClick={() => setShowPay(null)} className="btn-primary w-full">Collect Payment</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FeeTable({ data, onPay }: { data: FeeRecord[]; onPay: (f: FeeRecord) => void }) {
  return (
    <DataTable<FeeRecord>
      columns={[
        { key: 'student', label: 'Student', render: (f) => <span className="font-medium text-ink-800">{f.student}</span> },
        { key: 'batch', label: 'Batch' },
        { key: 'total', label: 'Total', render: (f) => `₹${f.total.toLocaleString()}` },
        { key: 'paid', label: 'Paid', render: (f) => <span className="text-success-600">₹{f.paid.toLocaleString()}</span> },
        { key: 'pending', label: 'Pending', render: (f) => <span className="text-error-600 font-medium">₹{f.pending.toLocaleString()}</span> },
        { key: 'term', label: 'Term' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'status', label: 'Status', render: (f) => <StatusBadge status={f.status} /> },
        { key: 'action', label: '', render: (f) => f.status !== 'paid' ? (
          <button onClick={(e) => { e.stopPropagation(); onPay(f); }} className="btn-primary text-xs px-3 py-1.5">Collect</button>
        ) : <span className="text-success-600 text-xs flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Done</span> },
      ]}
      data={data}
    />
  );
}

export function AdminSalary() {
  return (
    <div>
      <PageHeader title="Salary Management" subtitle="Teacher salaries, bonuses, increments & auto-payslips" actions={<button className="btn-primary"><Plus className="w-4 h-4" /> Run Payroll</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Payroll" value={`₹${(salaryRecords.reduce((s, r) => s + r.net, 0) / 1000).toFixed(0)}k`} icon={Wallet} color="primary" />
        <StatCard label="Paid" value={salaryRecords.filter((r) => r.status === 'paid').length} icon={Check} color="success" />
        <StatCard label="Pending" value={salaryRecords.filter((r) => r.status === 'pending').length} icon={Clock} color="warning" />
        <StatCard label="Bonuses" value="₹5k" icon={TrendingUp} color="accent" />
      </div>
      <Card>
        <CardHeader title="Salary Records — July 2026" subtitle="Auto-payslips sent via WhatsApp & email" />
        <DataTable
          columns={[
            { key: 'teacher', label: 'Teacher', render: (r) => <span className="font-medium text-ink-800">{r.teacher}</span> },
            { key: 'month', label: 'Month' },
            { key: 'gross', label: 'Gross', render: (r) => `₹${r.gross.toLocaleString()}` },
            { key: 'bonus', label: 'Bonus', render: (r) => r.bonus > 0 ? <span className="text-success-600">+₹{r.bonus}</span> : '-' },
            { key: 'deduction', label: 'Deduction', render: (r) => r.deduction > 0 ? <span className="text-error-600">-₹{r.deduction}</span> : '-' },
            { key: 'net', label: 'Net Pay', render: (r) => <span className="font-semibold text-ink-900">₹{r.net.toLocaleString()}</span> },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'action', label: '', render: (r) => r.status === 'pending' ? <button className="btn-primary text-xs px-3 py-1.5">Pay</button> : <button className="btn-ghost text-xs"><Download className="w-3.5 h-3.5" /> Slip</button> },
          ]}
          data={salaryRecords}
        />
      </Card>
    </div>
  );
}

export function AdminAttendance() {
  return (
    <div>
      <PageHeader title="Biometric Attendance" subtitle="Staff attendance with hardware integration & hours tracking" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Present Today" value="38/40" icon={Check} color="success" />
        <StatCard label="On Leave" value="2" icon={CalendarOff} color="warning" />
        <StatCard label="Avg Hours" value="7.2h" icon={Clock} color="primary" />
        <StatCard label="Late Arrivals" value="3" icon={Clock} color="error" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Weekly Overview" />
          <div className="p-5"><AttendanceBarChart data={attendanceData} /></div>
        </Card>
        <Card>
          <CardHeader title="Today's Log" subtitle="Biometric check-in/out" />
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {teachers.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50 transition">
                <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-lg bg-ink-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800">{t.name}</p>
                  <p className="text-xs text-ink-400">In: 9:{15 + i}0 · Out: --:--</p>
                </div>
                <Badge variant={t.status === 'active' ? 'success' : 'warning'}>{t.status === 'active' ? 'Present' : 'On Leave'}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

type AdminLeaveRow = {
  id: string;
  student_name: string;
  batch: string;
  leave_from: string;
  leave_to: string;
  reason: string;
  status: string;
  requester_type: string;
  created_at: string;
};

export function AdminLeaves() {
  const [leaves, setLeaves] = useState<AdminLeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('requester_type', 'teacher')
      .order('created_at', { ascending: false });
    if (!error && data) setLeaves(data as AdminLeaveRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    await supabase.from('leave_requests').update({ status }).eq('id', id);
    fetchLeaves();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const pending = leaves.filter((l) => l.status === 'pending');
  const decided = leaves.filter((l) => l.status !== 'pending');
  const current = tab === 0 ? pending : decided;

  return (
    <div>
      <PageHeader title="Teacher Leave Requests" subtitle="Approve or reject leave requests from teachers & mentors — student leaves are handled by their class teachers" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending" value={pending.length} icon={Clock} color="warning" />
        <StatCard label="Approved" value={leaves.filter((l) => l.status === 'approved').length} icon={Check} color="success" />
        <StatCard label="Rejected" value={leaves.filter((l) => l.status === 'rejected').length} icon={X} color="error" />
        <StatCard label="Total" value={leaves.length} icon={CalendarOff} color="primary" />
      </div>
      <Card>
        <Tabs
          defaultIndex={tab}
          tabs={[
            { label: `Pending (${pending.length})`, content: loading ? <div className="p-8 text-center text-ink-400">Loading...</div> : current.length === 0 ? <EmptyState icon={CalendarOff} title="No pending teacher requests" description="Teacher leave requests will appear here for your approval. Student leaves are routed to their class teachers." /> : <AdminLeaveTable data={current} onAction={handleAction} fmtDate={fmtDate} showActions /> },
            { label: `Decided (${decided.length})`, content: loading ? <div className="p-8 text-center text-ink-400">Loading...</div> : decided.length === 0 ? <EmptyState icon={CalendarOff} title="No decided requests" description="Approved or rejected teacher requests will appear here." /> : <AdminLeaveTable data={current} onAction={handleAction} fmtDate={fmtDate} /> },
          ]}
        />
      </Card>
      <div className="mt-4 flex items-center gap-2 p-4 card text-sm text-ink-500">
        <MessageCircle className="w-4 h-4 text-primary-600" />
        When approved/rejected, the teacher is automatically notified via WhatsApp, email & SMS. Student leave requests are routed to their class teacher, not here.
      </div>
    </div>
  );
}

function AdminLeaveTable({ data, onAction, fmtDate, showActions }: { data: AdminLeaveRow[]; onAction: (id: string, status: 'approved' | 'rejected') => void; fmtDate: (d: string) => string; showActions?: boolean }) {
  return (
    <DataTable<AdminLeaveRow>
      columns={[
        { key: 'student_name', label: 'Teacher', render: (l) => <span className="font-medium text-ink-800">{l.student_name}</span> },
        { key: 'batch', label: 'Department / Batch' },
        { key: 'leave_from', label: 'From', render: (l) => fmtDate(l.leave_from) },
        { key: 'leave_to', label: 'To', render: (l) => fmtDate(l.leave_to) },
        { key: 'reason', label: 'Reason', render: (l) => <span className="text-sm text-ink-600 max-w-xs truncate block">{l.reason}</span> },
        { key: 'status', label: 'Status', render: (l) => <StatusBadge status={l.status} /> },
        { key: 'action', label: '', render: (l) => showActions && l.status === 'pending' ? (
          <div className="flex gap-1">
            <button onClick={() => onAction(l.id, 'approved')} className="p-1.5 rounded-lg bg-success-50 text-success-600 hover:bg-success-100"><Check className="w-4 h-4" /></button>
            <button onClick={() => onAction(l.id, 'rejected')} className="p-1.5 rounded-lg bg-error-50 text-error-600 hover:bg-error-100"><X className="w-4 h-4" /></button>
          </div>
        ) : null },
      ]}
      data={data}
    />
  );
}

export function AdminEvents() {
  const [showAdd, setShowAdd] = useState(false);
  const typeColors: Record<string, string> = {
    class: 'bg-primary-50 text-primary-700', exam: 'bg-error-50 text-error-700',
    event: 'bg-accent-50 text-accent-700', holiday: 'bg-success-50 text-success-700', meeting: 'bg-warning-50 text-warning-700',
  };
  return (
    <div>
      <PageHeader title="Events & Holidays" subtitle="Manage events, programs, holidays & notices — visible on all dashboards" actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Event</button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((e) => (
          <Card key={e.id} hover className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', typeColors[e.type])}>{e.type}</div>
              <span className="text-xs text-ink-400">{e.date}</span>
            </div>
            <h3 className="font-semibold text-ink-900">{e.title}</h3>
            {e.batch && <p className="text-xs text-ink-400 mt-1">Batch: {e.batch}</p>}
          </Card>
        ))}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Event / Holiday" size="md">
        <div className="space-y-4">
          <div><label className="label">Event Title</label><input className="input" placeholder="Annual Tech Fest" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input className="input" type="date" /></div>
            <div><label className="label">Type</label>
              <Select value="event" onChange={() => {}} options={[
                { value: 'event', label: 'Event' }, { value: 'holiday', label: 'Holiday' },
                { value: 'meeting', label: 'Meeting' }, { value: 'exam', label: 'Exam' },
              ]} />
            </div>
          </div>
          <div><label className="label">Description</label><textarea className="input min-h-20" placeholder="Event details..." /></div>
          <button onClick={() => setShowAdd(false)} className="btn-primary w-full">Publish to All Dashboards</button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminIntegrations() {
  const integrations = [
    { name: 'Zoom', icon: Video, status: 'connected', desc: 'Schedule meetings & auto-import recordings', color: 'primary' },
    { name: 'Razorpay', icon: CreditCard, status: 'connected', desc: 'Online fee collection & payment links', color: 'success' },
    { name: 'Google Calendar', icon: Calendar, status: 'connected', desc: 'Two-way calendar synchronization', color: 'accent' },
    { name: 'WhatsApp Business', icon: MessageCircle, status: 'connected', desc: 'Auto messages to students & parents', color: 'success' },
    { name: 'Biometric Device', icon: Fingerprint, status: 'disconnected', desc: 'Hardware attendance integration', color: 'warning' },
    { name: 'Email (SMTP)', icon: Mail, status: 'connected', desc: 'Automated email notifications', color: 'primary' },
    { name: 'SMS Gateway', icon: Smartphone, status: 'connected', desc: 'SMS notifications for fees & alerts', color: 'accent' },
  ];
  return (
    <div>
      <PageHeader title="Integrations" subtitle="Connect third-party services for full automation" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((int) => (
          <Card key={int.name} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', int.color === 'primary' ? 'bg-primary-50' : int.color === 'success' ? 'bg-success-50' : int.color === 'accent' ? 'bg-accent-50' : 'bg-warning-50')}>
                <int.icon className={cn('w-5 h-5', int.color === 'primary' ? 'text-primary-600' : int.color === 'success' ? 'text-success-600' : int.color === 'accent' ? 'text-accent-600' : 'text-warning-600')} />
              </div>
              <Badge variant={int.status === 'connected' ? 'success' : 'warning'}>{int.status === 'connected' ? 'Connected' : 'Not Connected'}</Badge>
            </div>
            <h3 className="font-semibold text-ink-900">{int.name}</h3>
            <p className="text-sm text-ink-500 mt-1">{int.desc}</p>
            <button className={cn('w-full mt-4 text-sm', int.status === 'connected' ? 'btn-secondary' : 'btn-primary')}>
              {int.status === 'connected' ? 'Configure' : 'Connect Now'}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminCourses() {
  return <CourseBuilder instructorName="Admin" instructorRole="admin" />;
}

type CertTemplate = {
  id: string;
  course_id: string | null;
  title: string;
  issued_by: string;
  signature_text: string;
  border_style: string;
  created_at: string;
  course_title?: string;
};

export function AdminCertifications() {
  const [templates, setTemplates] = useState<CertTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<CertTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('certificate_templates')
      .select('*, courses!left(title)')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const rows = (data as unknown as Array<Omit<CertTemplate, 'course_title'> & { courses: { title: string } | null }>).map((r) => ({
        id: r.id,
        course_id: r.course_id,
        title: r.title,
        issued_by: r.issued_by,
        signature_text: r.signature_text,
        border_style: r.border_style,
        created_at: r.created_at,
        course_title: r.courses?.title || '—',
      }));
      setTemplates(rows);
      if (rows.length > 0) setPreview(rows[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const borderColors: Record<string, string> = {
    Classic: 'border-primary-600', Modern: 'border-accent-600',
    Elegant: 'border-success-600', Minimal: 'border-ink-400',
  };

  return (
    <div>
      <PageHeader title="Certificate Templates" subtitle="All certificate templates across courses — create or edit templates inside each course" />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Templates" subtitle={`${templates.length} total`} />
          {loading ? (
            <div className="p-8 text-center text-ink-400">Loading...</div>
          ) : templates.length === 0 ? (
            <EmptyState icon={Award} title="No templates yet" description="Certificate templates are created from inside each course. Go to Courses, open a course, and click 'Certificate Template'." />
          ) : (
            <div className="p-3 space-y-2">
              {templates.map((t) => (
                <button key={t.id} onClick={() => setPreview(t)} className={cn('w-full flex items-center gap-3 p-3 rounded-xl text-left transition', preview?.id === t.id ? 'bg-primary-50' : 'hover:bg-ink-50')}>
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"><Award className="w-5 h-5 text-primary-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800">{t.title}</p>
                    <p className="text-xs text-ink-400">{t.course_title} · {t.border_style}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-300" />
                </button>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-ink-900 mb-4">Live Preview</h3>
          {preview ? (
            <>
              <div className={cn('rounded-xl border-4 p-8 bg-gradient-to-br from-primary-50 to-accent-50 text-center', borderColors[preview.border_style] || 'border-primary-600')}>
                <div className="w-16 h-16 rounded-full bg-primary-600 mx-auto mb-4 flex items-center justify-center text-white"><Award className="w-8 h-8" /></div>
                <p className="text-xs text-ink-500 uppercase tracking-widest">{preview.title}</p>
                <h2 className="text-2xl font-bold font-display text-ink-900 mt-2">{preview.course_title}</h2>
                <p className="text-sm text-ink-500 mt-4">This certifies that</p>
                <p className="text-xl font-semibold text-primary-700 mt-1">{'{{student_name}}'}</p>
                <p className="text-sm text-ink-500 mt-2">has successfully completed the course</p>
                <div className="mt-6 flex justify-between items-end text-xs text-ink-500">
                  <div><p className="font-semibold text-ink-700">{preview.issued_by}</p><p>Issued On</p></div>
                  <div><p className="font-semibold text-ink-700">{preview.signature_text}</p><p>Signature</p></div>
                </div>
              </div>
              <p className="text-xs text-ink-400 mt-3 text-center">Auto-sent to student's WhatsApp & email upon course completion</p>
            </>
          ) : (
            <div className="text-center text-ink-400 py-12 text-sm">Select a template to preview</div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function AdminCalendar() {
  return <CalendarView />;
}

function CalendarView() {
  const days = Array.from({ length: 35 }, (_, i) => i - 2);
  const today = 24;
  const eventDays: Record<number, { type: string; title: string }[]> = {
    24: [{ type: 'class', title: 'Data Structures' }], 25: [{ type: 'class', title: 'Live Class' }],
    28: [{ type: 'exam', title: 'Mid-Sem Exam' }], 10: [{ type: 'meeting', title: 'PTM' }],
    15: [{ type: 'holiday', title: 'Independence Day' }], 20: [{ type: 'event', title: 'Tech Fest' }],
  };
  const typeColors: Record<string, string> = {
    class: 'bg-primary-100 text-primary-700', exam: 'bg-error-100 text-error-700',
    event: 'bg-accent-100 text-accent-700', holiday: 'bg-success-100 text-success-700', meeting: 'bg-warning-100 text-warning-700',
  };
  return (
    <div>
      <PageHeader title="Calendar" subtitle="Google Calendar-style view — classes, exams, events & holidays" actions={<button className="btn-primary"><Plus className="w-4 h-4" /> Add Event</button>} />
      <div className="grid lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-900">July 2026</h3>
            <div className="flex gap-1">
              <button className="btn-ghost p-2"><ChevronRight className="w-4 h-4 rotate-180" /></button>
              <button className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-ink-400 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => (
              <div key={day} className={cn('min-h-20 rounded-lg p-1.5 border', day === today ? 'border-primary-500 bg-primary-50' : day < 1 || day > 31 ? 'border-transparent bg-ink-50/50' : 'border-ink-100 hover:bg-ink-50')}>
                {(day >= 1 && day <= 31) && <p className="text-xs text-ink-500 mb-1">{day}</p>}
                {eventDays[day]?.map((e, i) => (
                  <div key={i} className={cn('text-[10px] px-1 py-0.5 rounded mb-0.5 truncate', typeColors[e.type])}>{e.title}</div>
                ))}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-ink-900 mb-3">Upcoming</h3>
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-ink-50">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', typeColors[e.type]?.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{e.title}</p>
                  <p className="text-xs text-ink-400">{e.date}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-ink-100">
            <p className="text-xs font-medium text-ink-500 mb-2">Legend</p>
            <div className="flex flex-wrap gap-2">
              {[{ l: 'Class', c: 'bg-primary-500' }, { l: 'Exam', c: 'bg-error-500' }, { l: 'Event', c: 'bg-accent-500' }, { l: 'Holiday', c: 'bg-success-500' }, { l: 'Meeting', c: 'bg-warning-500' }].map((x) => (
                <div key={x.l} className="flex items-center gap-1.5 text-xs text-ink-500">
                  <span className={cn('w-2.5 h-2.5 rounded-full', x.c)} /> {x.l}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
