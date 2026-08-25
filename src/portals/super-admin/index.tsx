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
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-ink-800">{b.name}</p>
                    <p className="text-sm font-semibold text-ink-900">₹{(b.revenue / 1000).toFixed(0)}k</p>
                  </div>
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 rounded-full" style={{ width: `${(b.revenue / 85000) * 100}%` }} />
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
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [localBranches, setLocalBranches] = useState(branches);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const filteredBranches = localBranches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.location.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div>
      <PageHeader title="Branches" subtitle="All campuses under the institution group" actions={
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches..." 
            className="pl-9 pr-4 py-2.5 text-sm bg-white border border-ink-200 rounded-xl focus:outline-none focus:border-primary-500 w-64" 
          />
        </div>
      } />
      <div className="grid sm:grid-cols-2 gap-4">
        {filteredBranches.map((b) => (
          <button key={b.id} onClick={() => setSelectedBranch(b)} className="card card-hover p-5 text-left w-full relative">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary-600 flex items-center justify-center text-white">
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
            <div className="mt-4 flex items-center justify-end">
              <span className="text-xs text-primary-600 font-medium flex items-center gap-1">View Analytics <ArrowUpRight className="w-3 h-3" /></span>
            </div>
          </button>
        ))}
      </div>

      <Modal open={!!selectedBranch} onClose={() => setSelectedBranch(null)} title="Branch Analytics" size="xl">
        {selectedBranch && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shrink-0">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-ink-900">{selectedBranch.name}</h2>
                  <p className="text-sm text-ink-500 flex items-center gap-1"><MapPin className="w-4 h-4" /> {selectedBranch.location}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-xs text-ink-400 mb-1">Monthly Revenue</p>
                  <p className="text-xl font-bold text-ink-900">₹{(selectedBranch.revenue / 1000).toFixed(0)}k</p>
                </div>
                <div className="w-px h-10 bg-ink-200"></div>
                <div className="text-right">
                  <p className="text-xs text-ink-400 mb-1">Growth</p>
                  <p className={cn('text-xl font-bold flex items-center gap-1 justify-end', selectedBranch.growth >= 0 ? 'text-success-600' : 'text-error-600')}>
                    {selectedBranch.growth >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    {Math.abs(selectedBranch.growth)}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button className="btn-secondary text-error-600 hover:bg-error-50 hover:border-error-200" onClick={() => {
                setLocalBranches(localBranches.filter(b => b.id !== selectedBranch.id));
                setSelectedBranch(null);
              }}>Delete Branch</button>
              <button className="btn-secondary" onClick={() => setIsEditing(true)}>Edit Branch</button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Card className="shadow-none border-ink-100">
                <CardHeader title="Revenue Trend" subtitle="Last 6 months performance" />
                <div className="p-4 h-[250px]">
                  {selectedBranch.revenueHistory ? (
                    <RevenueAreaChart data={selectedBranch.revenueHistory} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-400 text-sm">No historical data available</div>
                  )}
                </div>
              </Card>
              <Card className="shadow-none border-ink-100">
                <CardHeader title="Attendance Overview" subtitle="Daily present vs absent" />
                <div className="p-4 h-[250px]">
                  {selectedBranch.attendanceHistory ? (
                    <AttendanceBarChart data={selectedBranch.attendanceHistory} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-400 text-sm">No attendance data available</div>
                  )}
                </div>
              </Card>
            </div>

            <Card className="shadow-none border-ink-100">
              <CardHeader title="Top Performing Teachers" subtitle="Highest rated faculty this term" />
              {selectedBranch.topTeachers ? (
                <div className="p-2 space-y-2">
                  {selectedBranch.topTeachers.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-ink-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-lg" />
                        <div>
                          <p className="font-semibold text-ink-900">{t.name}</p>
                          <p className="text-xs text-ink-500">{t.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-warning-500 bg-warning-50 px-3 py-1 rounded-lg">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-bold">{t.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-ink-400 text-sm">No teacher data available</div>
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
        <div className="p-5"><RevenueAreaChart data={dynamicRevenueData} /></div>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..." 
                className="pl-9 pr-4 py-2.5 text-sm bg-white border border-ink-200 rounded-xl focus:outline-none focus:border-primary-500 w-48" 
              />
            </div>
          )}
          <Select value={reportType} onChange={setReportType} options={[
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
              { key: 'attendance', label: 'Attendance', render: (s) => `${s.attendance}%` },
              { key: 'feePaid', label: 'Fee Paid', render: (s) => `₹${(s.feePaid / 1000).toFixed(0)}k / ₹${(s.feeTotal / 1000).toFixed(0)}k` },
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
              { key: 'attendance', label: 'Attendance', render: (t) => `${t.attendance}%` },
              { key: 'salary', label: 'Salary', render: (t) => `₹${(t.salary / 1000).toFixed(0)}k` },
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users..." 
              className="pl-9 pr-4 py-2.5 text-sm bg-white border border-ink-200 rounded-xl focus:outline-none focus:border-primary-500 w-64" 
            />
          </div>
        } />
        <DataTable<AdminUser>
          columns={[
            { key: 'name', label: 'Name', render: (u) => <span className="font-medium text-ink-800">{u.name}</span> },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role', render: (u) => (
              <Badge variant="primary">{u.role.replace('_', ' ')}</Badge>
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

export { InterBranchTransfer, ExecutiveDecisionCenter, GlobalCampaignManager, DataQualityMonitoring, AuditLogs, BranchTheming, GlobalCurriculum, ComplianceReporting, EmergencyBroadcast, AlumniNetwork } from './SuperAdminAddons';
export { RoleBuilder } from './RoleBuilder';
