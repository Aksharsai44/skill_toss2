import {
  TrendingUp, Users, Building2, Wallet, Network, Target,
  MapPin, ArrowUpRight, ArrowDownRight, Download, Filter, Star, Plus, Search,
} from 'lucide-react';
import { useState } from 'react';
import { PageHeader, Card, CardHeader } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { RevenueAreaChart, DepartmentPieChart, AttendanceBarChart } from '@/components/ui/Charts';
import { Select } from '@/components/ui/Tabs';
import { branches, revenueData, departmentData, attendanceData, students, teachers, institutions, adminUsers } from '@/lib/mockData';
import type { Institution, AdminUser, Branch } from '@/lib/types';
import { cn } from '@/lib/cn';

export function SuperAdminDashboard() {
  const totalRevenue = branches.reduce((s, b) => s + b.revenue, 0);
  const totalStudents = branches.reduce((s, b) => s + b.students, 0);
  const totalTeachers = branches.reduce((s, b) => s + b.teachers, 0);

  return (
    <div>
      <PageHeader title="Super Admin Dashboard" subtitle="Consolidated view across all branches & departments" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={`₹${(totalRevenue / 1000).toFixed(0)}k`} icon={Wallet} trend={15} trendLabel="vs last month" color="primary" to="/super-admin/revenue" />
        <StatCard label="Total Students" value={totalStudents.toLocaleString()} icon={Users} trend={8} color="accent" to="/super-admin/users" />
        <StatCard label="Total Faculty" value={totalTeachers} icon={Building2} trend={4} color="success" to="/super-admin/reports" />
        <StatCard label="Active Branches" value={branches.length} icon={Network} color="warning" to="/super-admin/branches" />
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <p className="text-sm font-medium text-ink-800 truncate">{b.name}</p>
                    <p className="text-sm font-semibold text-ink-900 tabular-nums shrink-0">₹{(b.revenue / 1000).toFixed(0)}k</p>
                  </div>
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 rounded-full" style={{ width: `${(b.revenue / 85000) * 100}%` }} />
                  </div>
                </div>
                <span className={cn('text-xs font-semibold flex items-center gap-0.5 tabular-nums shrink-0', b.growth >= 0 ? 'text-success-600' : 'text-error-600')}>
                  {b.growth >= 0 ? <ArrowUpRight className="w-3 h-3" aria-hidden="true" /> : <ArrowDownRight className="w-3 h-3" aria-hidden="true" />}
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
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [localBranches, setLocalBranches] = useState(branches);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const filteredBranches = localBranches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.location.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div>
      <PageHeader title="Branches" subtitle="All campuses under the institution group" actions={
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search branches"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches..."
            className="input pl-9 w-full sm:w-64"
          />
        </div>
      } />
      <div className="grid sm:grid-cols-2 gap-4">
        {filteredBranches.map((b) => (
          <button key={b.id} onClick={() => setSelectedBranch(b)} className="card card-hover p-5 text-left w-full relative">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center text-white shrink-0">
                  <Building2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink-900 truncate">{b.name}</h3>
                  <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" aria-hidden="true" /> <span className="truncate">{b.location}</span></p>
                </div>
              </div>
              <span className={cn('text-sm font-semibold flex items-center gap-0.5 shrink-0 tabular-nums', b.growth >= 0 ? 'text-success-600' : 'text-error-600')}>
                {b.growth >= 0 ? <ArrowUpRight className="w-4 h-4" aria-hidden="true" /> : <ArrowDownRight className="w-4 h-4" aria-hidden="true" />}
                {Math.abs(b.growth)}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-control border border-ink-200 bg-ink-50 p-3 text-center">
                <p className="text-xl font-semibold text-ink-900 tabular-nums">{b.students}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">Students</p>
              </div>
              <div className="rounded-control border border-ink-200 bg-ink-50 p-3 text-center">
                <p className="text-xl font-semibold text-ink-900 tabular-nums">{b.teachers}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">Teachers</p>
              </div>
              <div className="rounded-control border border-ink-200 bg-ink-50 p-3 text-center">
                <p className="text-xl font-semibold text-ink-900 tabular-nums">₹{(b.revenue / 1000).toFixed(0)}k</p>
                <p className="text-[11px] text-ink-500 mt-0.5">Revenue</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-end">
              <span className="text-xs text-primary-600 font-medium flex items-center gap-1">View Analytics <ArrowUpRight className="w-3 h-3" aria-hidden="true" /></span>
            </div>
          </button>
        ))}
      </div>

      <Modal open={!!selectedBranch} onClose={() => setSelectedBranch(null)} title="Branch Analytics" size="xl">
        {selectedBranch && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-primary-600 flex items-center justify-center text-white shrink-0">
                  <Building2 className="w-7 h-7" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold truncate">{selectedBranch.name}</h2>
                  <p className="text-sm text-ink-500 flex items-center gap-1 mt-0.5"><MapPin className="w-4 h-4 shrink-0" aria-hidden="true" /> <span className="truncate">{selectedBranch.location}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="sm:text-right">
                  <p className="text-xs text-ink-500 mb-1">Monthly Revenue</p>
                  <p className="text-xl font-semibold text-ink-900 tabular-nums">₹{(selectedBranch.revenue / 1000).toFixed(0)}k</p>
                </div>
                <div className="w-px h-10 bg-ink-200" aria-hidden="true" />
                <div className="sm:text-right">
                  <p className="text-xs text-ink-500 mb-1">Growth</p>
                  <p className={cn('text-xl font-semibold flex items-center gap-1 sm:justify-end tabular-nums', selectedBranch.growth >= 0 ? 'text-success-600' : 'text-error-600')}>
                    {selectedBranch.growth >= 0 ? <ArrowUpRight className="w-5 h-5" aria-hidden="true" /> : <ArrowDownRight className="w-5 h-5" aria-hidden="true" />}
                    {Math.abs(selectedBranch.growth)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button className="btn-secondary text-error-600 hover:bg-error-50 hover:border-error-200" onClick={() => {
                setLocalBranches(localBranches.filter(b => b.id !== selectedBranch.id));
                setSelectedBranch(null);
              }}>Delete Branch</button>
              <button className="btn-secondary" onClick={() => setIsEditing(true)}>Edit Branch</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card className="shadow-none border-ink-100">
                <CardHeader title="Revenue Trend" subtitle="Last 6 months performance" />
                <div className="p-4 h-[250px]">
                  {selectedBranch.revenueHistory ? (
                    <RevenueAreaChart data={selectedBranch.revenueHistory} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-500 text-sm">No historical data available</div>
                  )}
                </div>
              </Card>
              <Card className="shadow-none border-ink-100">
                <CardHeader title="Attendance Overview" subtitle="Daily present vs absent" />
                <div className="p-4 h-[250px]">
                  {selectedBranch.attendanceHistory ? (
                    <AttendanceBarChart data={selectedBranch.attendanceHistory} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-500 text-sm">No attendance data available</div>
                  )}
                </div>
              </Card>
            </div>

            <Card className="shadow-none border-ink-100">
              <CardHeader title="Top Performing Teachers" subtitle="Highest rated faculty this term" />
              {selectedBranch.topTeachers ? (
                <div className="p-3 space-y-2">
                  {selectedBranch.topTeachers.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-control border border-ink-100 bg-ink-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-lg bg-ink-100 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-800 truncate">{t.name}</p>
                          <p className="text-xs text-ink-500 truncate mt-0.5">{t.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-warning-700 bg-warning-50 border border-warning-100 px-2.5 py-1 rounded-md shrink-0">
                        <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        <span className="text-sm font-semibold tabular-nums">{t.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-ink-500 text-sm">No teacher data available</div>
              )}
            </Card>
          </div>
        )}
        {selectedBranch && isEditing && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const updated = {
              ...selectedBranch,
              name: fd.get('name') as string,
              location: fd.get('location') as string,
            };
            setLocalBranches(localBranches.map(b => b.id === selectedBranch.id ? updated : b));
            setSelectedBranch(updated);
            setIsEditing(false);
          }}>
            <div>
              <label className="label">Branch Name</label>
              <input name="name" required className="input" defaultValue={selectedBranch.name} />
            </div>
            <div>
              <label className="label">Location</label>
              <input name="location" required className="input" defaultValue={selectedBranch.location} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function Revenue() {
  const [period, setPeriod] = useState('monthly');

  const dynamicRevenueData = period === 'weekly' 
    ? [{ month: 'Week 1', revenue: 20000, students: 3000 }, { month: 'Week 2', revenue: 35000, students: 3100 }, { month: 'Week 3', revenue: 45000, students: 3200 }, { month: 'Week 4', revenue: 60000, students: 3300 }]
    : period === 'quarterly'
    ? [{ month: 'Q1', revenue: 400000, students: 3000 }, { month: 'Q2', revenue: 500000, students: 3100 }, { month: 'Q3', revenue: 650000, students: 3200 }, { month: 'Q4', revenue: 750000, students: 3300 }]
    : period === 'yearly'
    ? [{ month: '2021', revenue: 1500000, students: 2500 }, { month: '2022', revenue: 2200000, students: 2800 }, { month: '2023', revenue: 3400000, students: 3200 }]
    : revenueData;

  return (
    <div>
      <PageHeader title="Revenue Analytics" subtitle="Detailed revenue breakdown across branches" actions={
        <Select label="Period" value={period} onChange={setPeriod} options={[
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
        <div className="p-5"><RevenueAreaChart data={dynamicRevenueData} /></div>
      </Card>
      <Card>
        <CardHeader title="Branch-wise Revenue" />
        <DataTable
          columns={[
            { key: 'name', label: 'Branch' },
            { key: 'location', label: 'Location' },
            { key: 'students', label: 'Students', render: (r) => <span className="tabular-nums">{r.students.toLocaleString()}</span> },
            { key: 'revenue', label: 'Revenue', render: (r) => <span className="tabular-nums">₹{(r.revenue / 1000).toFixed(0)}k</span> },
            { key: 'growth', label: 'Growth', render: (r) => (
              <span className={cn('font-semibold flex items-center gap-0.5 tabular-nums', r.growth >= 0 ? 'text-success-600' : 'text-error-600')}>
                {r.growth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" /> : <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />}
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
            { key: 'count', label: 'Total Leads', render: (r) => <span className="tabular-nums">{r.count}</span> },
            { key: 'converted', label: 'Converted', render: (r) => <span className="tabular-nums">{r.converted}</span> },
            { key: 'rate', label: 'Conversion Rate', render: (r) => (
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-ink-100 rounded-full overflow-hidden shrink-0">
                  <div className="h-full bg-success-500 rounded-full" style={{ width: `${r.rate}%` }} />
                </div>
                <span className="text-sm font-medium text-ink-700 tabular-nums">{r.rate}%</span>
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaculty = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.subjects.some(sub => sub.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDownload = () => {
    let dataToDownload: Record<string, unknown>[] = [];
    if (reportType === 'students') {
      dataToDownload = filteredStudents;
    } else if (reportType === 'faculty') {
      dataToDownload = filteredFaculty;
    } else {
      alert('Finance reports are currently generated separately.');
      return;
    }
    
    if (dataToDownload.length === 0) {
      alert('No data to download.');
      return;
    }

    const headers = Object.keys(dataToDownload[0]).join(',');
    const rows = dataToDownload.map(row => 
      Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Consolidated Reports" subtitle="Cross-branch reports for students, faculty & finance" actions={
        <div className="flex gap-3">
          {(reportType === 'students' || reportType === 'faculty') && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                aria-label={`Search ${reportType}`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="input pl-9 w-full sm:w-48"
              />
            </div>
          )}
          <Select label="Report type" value={reportType} onChange={setReportType} options={[
            { value: 'students', label: 'Student Report' },
            { value: 'faculty', label: 'Faculty Report' },
            { value: 'finance', label: 'Finance Report' },
          ]} />
          <button className="btn-primary" onClick={handleDownload}><Download className="w-4 h-4" /> Download</button>
        </div>
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
              { key: 'attendance', label: 'Attendance', render: (s) => <span className="tabular-nums">{s.attendance}%</span> },
              { key: 'feePaid', label: 'Fee Paid', render: (s) => <span className="tabular-nums whitespace-nowrap">₹{(s.feePaid / 1000).toFixed(0)}k / ₹{(s.feeTotal / 1000).toFixed(0)}k</span> },
              { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s.status} /> },
            ]}
            data={filteredStudents}
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
              { key: 'attendance', label: 'Attendance', render: (t) => <span className="tabular-nums">{t.attendance}%</span> },
              { key: 'salary', label: 'Salary', render: (t) => <span className="tabular-nums">₹{(t.salary / 1000).toFixed(0)}k</span> },
              { key: 'status', label: 'Status', render: (t) => <StatusBadge status={t.status} /> },
            ]}
            data={filteredFaculty}
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

export function InstitutionManagement() {
  const [isAdding, setIsAdding] = useState(false);
  const [editingInst, setEditingInst] = useState<Institution | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localInstitutions, setLocalInstitutions] = useState(institutions);

  const filteredInstitutions = localInstitutions.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Institution Management" subtitle="Manage all institutions across the platform" actions={<button className="btn-primary" onClick={() => setIsAdding(true)}><Plus className="w-4 h-4" /> Add Institution</button>} />
      <Card>
        <CardHeader title="All Institutions" action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search institutions"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search institutions..."
              className="input pl-9 w-full sm:w-64"
            />
          </div>
        } />
        <DataTable<Institution>
          columns={[
            { key: 'name', label: 'Institution Name', render: (i) => <span className="font-medium text-ink-800">{i.name}</span> },
            { key: 'type', label: 'Type' },
            { key: 'location', label: 'Location' },
            { key: 'joinedDate', label: 'Joined Date' },
            { key: 'status', label: 'Status', render: (i) => <StatusBadge status={i.status} /> },
            { key: 'actions', label: '', render: (i) => (
              <div className="flex gap-1 justify-end">
                <button className="px-2 py-1 -my-1 rounded-md text-primary-600 hover:text-primary-700 hover:bg-primary-50 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40" onClick={() => setEditingInst(i)}>Edit</button>
                <button className="px-2 py-1 -my-1 rounded-md text-error-600 hover:text-error-700 hover:bg-error-50 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500/40" onClick={() => setLocalInstitutions(localInstitutions.filter(x => x.id !== i.id))}>Delete</button>
              </div>
            ) },
          ]}
          data={filteredInstitutions}
        />
      </Card>

      <Modal open={isAdding || !!editingInst} onClose={() => { setIsAdding(false); setEditingInst(null); }} title={editingInst ? "Edit Institution" : "Add Institution"} size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          
          if (editingInst) {
            const updated = {
              ...editingInst,
              name: fd.get('name') as string,
              type: fd.get('type') as string,
              location: fd.get('location') as string,
              status: fd.get('status') as Institution['status'],
            };
            setLocalInstitutions(localInstitutions.map(i => i.id === editingInst.id ? updated : i));
            setEditingInst(null);
          } else {
            const newInst: Institution = {
              id: `inst-${Date.now()}`,
              name: fd.get('name') as string,
              type: fd.get('type') as string,
              location: fd.get('location') as string,
              status: fd.get('status') as Institution['status'],
              joinedDate: new Date().toISOString().split('T')[0]
            };
            setLocalInstitutions([newInst, ...localInstitutions]);
            setIsAdding(false);
          }
        }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Institution Name</label>
              <input name="name" required className="input" defaultValue={editingInst?.name} placeholder="e.g. Apex Global School" />
            </div>
            <div>
              <label className="label">Type</label>
              <select name="type" className="input" defaultValue={editingInst?.type}>
                <option value="School">School</option>
                <option value="College">College</option>
                <option value="University">University</option>
                <option value="Training Center">Training Center</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" className="input" defaultValue={editingInst?.status}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="onboarding">Onboarding</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Location</label>
              <input name="location" required className="input" defaultValue={editingInst?.location} placeholder="e.g. Mumbai, Maharashtra" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setIsAdding(false); setEditingInst(null); }}>Cancel</button>
            <button type="submit" className="btn-primary">{editingInst ? "Save Changes" : "Add Institution"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function AdminManagement() {
  const [isAdding, setIsAdding] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localAdmins, setLocalAdmins] = useState(adminUsers);

  const filteredAdmins = localAdmins.filter(u => 
    u.role !== 'admin' && 
    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <PageHeader title="Admin Management" subtitle="Manage super admins and product admins" actions={<button className="btn-primary" onClick={() => setIsAdding(true)}><Plus className="w-4 h-4" /> Add Admin</button>} />
      <Card>
        <CardHeader title="All Admins" action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search admins"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search admins..."
              className="input pl-9 w-full sm:w-64"
            />
          </div>
        } />
        <DataTable<AdminUser>
          columns={[
            { key: 'name', label: 'Name', render: (u) => <span className="font-medium text-ink-800">{u.name}</span> },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role', render: (u) => (
              <Badge variant={u.role === 'super_admin' ? 'error' : u.role === 'product_admin' ? 'warning' : 'primary'}>
                <span className="capitalize">{u.role.replace('_', ' ')}</span>
              </Badge>
            ) },
            { key: 'institution', label: 'Institution' },
            { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
            { key: 'actions', label: '', render: (u) => (
              <div className="flex gap-1 justify-end">
                <button className="px-2 py-1 -my-1 rounded-md text-primary-600 hover:text-primary-700 hover:bg-primary-50 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40" onClick={() => setEditingAdmin(u)}>Edit</button>
                <button className="px-2 py-1 -my-1 rounded-md text-error-600 hover:text-error-700 hover:bg-error-50 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500/40" onClick={() => setLocalAdmins(localAdmins.filter(x => x.id !== u.id))}>Delete</button>
              </div>
            ) },
          ]}
          data={filteredAdmins}
        />
      </Card>

      <Modal open={isAdding || !!editingAdmin} onClose={() => { setIsAdding(false); setEditingAdmin(null); }} title={editingAdmin ? "Edit Admin" : "Add Admin"} size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          
          if (editingAdmin) {
            const updated = {
              ...editingAdmin,
              name: fd.get('name') as string,
              email: fd.get('email') as string,
              role: fd.get('role') as AdminUser['role'],
              institution: fd.get('institution') as string,
            };
            setLocalAdmins(localAdmins.map(a => a.id === editingAdmin.id ? updated : a));
            setEditingAdmin(null);
          } else {
            const newAdmin: AdminUser = {
              id: `usr-${Date.now()}`,
              name: fd.get('name') as string,
              email: fd.get('email') as string,
              role: fd.get('role') as AdminUser['role'],
              institution: fd.get('institution') as string,
              status: 'active'
            };
            setLocalAdmins([newAdmin, ...localAdmins]);
            setIsAdding(false);
          }
        }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full Name</label>
              <input name="name" required className="input" defaultValue={editingAdmin?.name} placeholder="e.g. Sarah Connor" />
            </div>
            <div className="col-span-2">
              <label className="label">Email Address</label>
              <input name="email" type="email" required className="input" defaultValue={editingAdmin?.email} placeholder="sarah@example.com" />
            </div>
            <div>
              <label className="label">Role</label>
              <select name="role" className="input" defaultValue={editingAdmin?.role}>
                <option value="super_admin">Super Admin</option>
                <option value="product_admin">Product Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Institution</label>
              <select name="institution" className="input" defaultValue={editingAdmin?.institution || 'None (Global)'}>
                <option value="None (Global)">None (Global)</option>
                {institutions.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setIsAdding(false); setEditingAdmin(null); }}>Cancel</button>
            <button type="submit" className="btn-primary">{editingAdmin ? "Save Changes" : "Add Admin"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredUsers = adminUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.institution.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="All Users" subtitle="View all admins and institution staff" />
      <Card>
        <CardHeader title="Directory" action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search users"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="input pl-9 w-full sm:w-64"
            />
          </div>
        } />
        <DataTable<AdminUser>
          columns={[
            { key: 'name', label: 'Name', render: (u) => <span className="font-medium text-ink-800">{u.name}</span> },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role', render: (u) => (
              <Badge variant="primary"><span className="capitalize">{u.role.replace('_', ' ')}</span></Badge>
            ) },
            { key: 'institution', label: 'Institution' },
            { key: 'status', label: 'Status', render: (u) => <StatusBadge status={u.status} /> },
          ]}
          data={filteredUsers}
        />
      </Card>
    </div>
  );
}

export { InterBranchTransfer, ExecutiveDecisionCenter, GlobalCampaignManager, DataQualityMonitoring, AuditLogs, BranchTheming } from './SuperAdminAddons';
export { RoleBuilder } from './RoleBuilder';
