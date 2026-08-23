import {
  Building2, TrendingUp, Users, Inbox, Check, Clock, Star,
  ArrowUpRight, Video, CreditCard, MessageCircle, Calendar, Sparkles,
  Fingerprint, Award, MessagesSquare, Palette, ToggleLeft, Plus, Search,
  AlertTriangle, Send, BookOpen, Home, Bus
} from 'lucide-react';
import { useState } from 'react';
import { PageHeader, Card, CardHeader } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Tabs';
import { RevenueAreaChart } from '@/components/ui/Charts';
import { clients, demoRequests, revenueData, featureCatalog, supportTickets } from '@/lib/mockData';
import type { Client, DemoRequest, Ticket, TicketMessage } from '@/lib/types';
import { cn } from '@/lib/cn';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Video, CreditCard, MessageCircle, Calendar, Sparkles, Fingerprint, Award, MessagesSquare, BookOpen, Home, Bus
};

export function ProductAdminDashboard() {
  const activeClients = clients.filter((c) => c.status === 'active').length;
  const trialClients = clients.filter((c) => c.status === 'trial').length;
  const totalMRR = clients.reduce((sum, c) => sum + c.mrr, 0);
  const totalStudents = clients.reduce((sum, c) => sum + c.students, 0);

  return (
    <div>
      <PageHeader title="Product Admin Dashboard" subtitle="Overview of all clients, revenue, demo requests & platform health" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total MRR" value={`₹${(totalMRR / 1000).toFixed(0)}k`} icon={TrendingUp} trend={18} trendLabel="vs last month" color="primary" to="/product-admin/plans" />
        <StatCard label="Active Clients" value={activeClients} icon={Building2} trend={12} trendLabel="2 new this month" color="success" to="/product-admin/clients" />
        <StatCard label="Trial Clients" value={trialClients} icon={Clock} trendLabel="Converting soon" color="warning" to="/product-admin/clients" />
        <StatCard label="Total Students" value={totalStudents.toLocaleString()} icon={Users} trend={8} trendLabel="across all clients" color="accent" to="/product-admin/clients" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue Trend" subtitle="Monthly recurring revenue across all clients" />
          <div className="p-5"><RevenueAreaChart data={revenueData} /></div>
        </Card>
        <Card>
          <CardHeader title="Recent Demo Requests" subtitle="Latest inbound leads" />
          <div className="p-3 space-y-2">
            {demoRequests.slice(0, 4).map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-control hover:bg-ink-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{d.organization}</p>
                  <p className="text-xs text-ink-500 truncate mt-0.5">{d.type} · {d.date}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Client Overview" subtitle="All clients with plan, status & feature usage" />
        <DataTable<Client>
          columns={[
            { key: 'name', label: 'Client', render: (c) => (
              <div className="flex items-center gap-3">
                <img src={c.logo} alt="" className="w-8 h-8 rounded-lg bg-ink-100 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-ink-800 truncate">{c.name}</p>
                  <p className="text-xs text-ink-500 truncate mt-0.5">{c.type}</p>
                </div>
              </div>
            ) },
            { key: 'plan', label: 'Plan', render: (c) => <Badge variant="primary">{c.plan}</Badge> },
            { key: 'students', label: 'Students', render: (c) => <span className="tabular-nums">{c.students.toLocaleString()}</span> },
            { key: 'teachers', label: 'Teachers', render: (c) => <span className="tabular-nums">{c.teachers}</span> },
            { key: 'mrr', label: 'MRR', render: (c) => <span className="tabular-nums">₹{(c.mrr / 1000).toFixed(0)}k</span> },
            { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
            { key: 'features', label: 'Features', render: (c) => (
              <div className="flex flex-wrap gap-1">
                {Object.entries(c.features).filter(([, v]) => v).map(([k]) => {
                  const Icon = iconMap[k] || ToggleLeft;
                  return <span key={k} title={k} className="p-1 rounded-md bg-primary-50 border border-primary-100"><Icon className="w-3.5 h-3.5 text-primary-600" aria-hidden="true" /></span>;
                })}
              </div>
            ) },
          ]}
          data={clients}
        />
      </Card>
    </div>
  );
}

export function DemoRequests() {
  const [selected, setSelected] = useState<DemoRequest | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingDemo, setIsEditingDemo] = useState(false);
  const [localDemoRequests, setLocalDemoRequests] = useState(demoRequests);
  return (
    <div>
      <PageHeader title="Demo Requests" subtitle="Inbound leads from schools, colleges & training institutes" actions={<button className="btn-primary" onClick={() => setIsAdding(true)}><Plus className="w-4 h-4" /> Add Request</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="New" value={localDemoRequests.filter((d) => d.status === 'new').length} icon={Inbox} color="primary" />
        <StatCard label="Contacted" value={localDemoRequests.filter((d) => d.status === 'contacted').length} icon={MessageCircle} color="accent" />
        <StatCard label="Demo Scheduled" value={localDemoRequests.filter((d) => d.status === 'demo-scheduled').length} icon={Calendar} color="warning" />
        <StatCard label="Conversion Rate" value="68%" icon={TrendingUp} trend={5} color="success" />
      </div>
      <Card>
        <DataTable<DemoRequest>
          columns={[
            { key: 'organization', label: 'Organization', render: (d) => (
              <div className="min-w-0">
                <p className="font-medium text-ink-800 truncate">{d.organization}</p>
                <p className="text-xs text-ink-500 mt-0.5">{d.type}</p>
              </div>
            ) },
            { key: 'contact', label: 'Contact', render: (d) => (
              <div className="min-w-0">
                <p className="text-ink-700 truncate">{d.contact}</p>
                <p className="text-xs text-ink-500 truncate mt-0.5" title={d.email}>{d.email}</p>
              </div>
            ) },
            { key: 'phone', label: 'Phone', render: (d) => <span className="tabular-nums">{d.phone}</span> },
            { key: 'date', label: 'Requested', render: (d) => <span className="tabular-nums">{d.date}</span> },
            { key: 'notes', label: 'Notes', render: (d) => <span className="text-xs text-ink-500 max-w-xs truncate block">{d.notes}</span> },
            { key: 'status', label: 'Status', render: (d) => <StatusBadge status={d.status} /> },
          ]}
          data={localDemoRequests}
          onRowClick={setSelected}
        />
      </Card>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Demo Request Details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-primary-600" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-ink-900 text-lg truncate">{selected.organization}</h3>
                <p className="text-sm text-ink-500">{selected.type}</p>
              </div>
              <div className="ml-auto shrink-0"><StatusBadge status={selected.status} /></div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-ink-500">Contact Person</dt><dd className="font-medium text-ink-800 mt-0.5">{selected.contact}</dd></div>
              <div className="min-w-0"><dt className="text-ink-500">Email</dt><dd className="font-medium text-ink-800 truncate mt-0.5">{selected.email}</dd></div>
              <div><dt className="text-ink-500">Phone</dt><dd className="font-medium text-ink-800 tabular-nums mt-0.5">{selected.phone}</dd></div>
              <div><dt className="text-ink-500">Date</dt><dd className="font-medium text-ink-800 tabular-nums mt-0.5">{selected.date}</dd></div>
            </dl>
            <div><p className="text-ink-500 text-sm mb-1.5">Notes</p><p className="text-sm leading-6 text-ink-700 bg-ink-50 border border-ink-200 rounded-control p-3">{selected.notes}</p></div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1 text-error-600 hover:bg-error-50 hover:border-error-200" onClick={() => {
                setLocalDemoRequests(localDemoRequests.filter(d => d.id !== selected.id));
                setSelected(null);
              }}>Delete</button>
              <button className="btn-secondary flex-1" onClick={() => setIsEditingDemo(true)}>Edit</button>
              <button className="btn-secondary flex-1" onClick={() => {
                setLocalDemoRequests(localDemoRequests.map(d => d.id === selected.id ? { ...d, status: 'contacted' } : d));
                setSelected(null);
              }}>Mark Contacted</button>
              <button className="btn-primary flex-1" onClick={() => {
                setLocalDemoRequests(localDemoRequests.map(d => d.id === selected.id ? { ...d, status: 'demo-scheduled' } : d));
                setSelected(null);
              }}>Schedule Demo</button>
            </div>
          </div>
        )}
        {selected && isEditingDemo && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const updated = {
              ...selected,
              organization: fd.get('organization') as string,
              type: fd.get('type') as DemoRequest['type'],
              contact: fd.get('contact') as string,
              email: fd.get('email') as string,
              phone: fd.get('phone') as string,
              notes: fd.get('notes') as string,
            };
            setLocalDemoRequests(localDemoRequests.map(d => d.id === selected.id ? updated : d));
            setSelected(updated);
            setIsEditingDemo(false);
          }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Organization Name</label>
                <input name="organization" required className="input" defaultValue={selected.organization} />
              </div>
              <div>
                <label className="label">Type</label>
                <select name="type" className="input" defaultValue={selected.type}>
                  <option>School</option>
                  <option>College</option>
                  <option>Training Institute</option>
                </select>
              </div>
              <div>
                <label className="label">Contact Person</label>
                <input name="contact" required className="input" defaultValue={selected.contact} />
              </div>
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" pattern=".+@.+\.com" title="Email must end in .com" required className="input" defaultValue={selected.email} />
              </div>
              <div className="col-span-2">
                <label className="label">Phone</label>
                <input name="phone" type="tel" pattern="[0-9]{10}" title="Phone must be 10 digits" required className="input" defaultValue={selected.phone} />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea name="notes" className="input" rows={3} defaultValue={selected.notes}></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setIsEditingDemo(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={isAdding} onClose={() => setIsAdding(false)} title="Add Demo Request" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const newReq: DemoRequest = {
            id: `req-${Date.now()}`,
            organization: fd.get('organization') as string,
            type: fd.get('type') as DemoRequest['type'],
            contact: fd.get('contact') as string,
            email: fd.get('email') as string,
            phone: fd.get('phone') as string,
            date: new Date().toISOString().split('T')[0],
            status: 'new',
            notes: fd.get('notes') as string,
          };
          setLocalDemoRequests([newReq, ...localDemoRequests]);
          setIsAdding(false);
        }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Organization Name</label>
              <input name="organization" required className="input" placeholder="e.g. Acme Institute" />
            </div>
            <div>
              <label className="label">Type</label>
              <select name="type" className="input">
                <option>School</option>
                <option>College</option>
                <option>Training Institute</option>
              </select>
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input name="contact" required className="input" placeholder="John Doe" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" pattern=".+@.+\.com" title="Email must end in .com" required className="input" placeholder="john@example.com" />
            </div>
            <div className="col-span-2">
              <label className="label">Phone</label>
              <input name="phone" type="tel" pattern="[0-9]{10}" title="Phone must be 10 digits" required className="input" placeholder="9876543210" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" className="input" rows={3} placeholder="Any specific requirements..."></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Submit Request</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function Clients() {
  const [selected, setSelected] = useState<Client | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [localClients, setLocalClients] = useState(clients);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const filteredClients = localClients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div>
      <PageHeader title="Clients" subtitle="All institutions using Skill Toss" actions={
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" aria-hidden="true" />
            <input type="search" aria-label="Search clients" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search clients..." className="input pl-9 w-full sm:w-48" />
          </div>
          <button className="btn-primary" onClick={() => setIsAdding(true)}><Plus className="w-4 h-4" /> Add Client</button>
        </>
      } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((c) => (
          <button key={c.id} onClick={() => setSelected(c)} className="card card-hover p-5 text-left">
            <div className="flex items-start justify-between gap-3 mb-4">
              <img src={c.logo} alt="" className="w-12 h-12 rounded-xl bg-ink-100 shrink-0" />
              <StatusBadge status={c.status} />
            </div>
            <h3 className="font-semibold text-ink-900 truncate">{c.name}</h3>
            <p className="text-xs text-ink-500 mt-0.5 mb-3.5 truncate">{c.type} · Joined {c.joinedDate}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-control border border-ink-200 bg-ink-50 py-2">
                <p className="text-lg font-semibold text-ink-900 tabular-nums">{c.students}</p>
                <p className="text-[11px] text-ink-500">Students</p>
              </div>
              <div className="rounded-control border border-ink-200 bg-ink-50 py-2">
                <p className="text-lg font-semibold text-ink-900 tabular-nums">{c.teachers}</p>
                <p className="text-[11px] text-ink-500">Teachers</p>
              </div>
              <div className="rounded-control border border-ink-200 bg-ink-50 py-2">
                <p className="text-lg font-semibold text-ink-900 tabular-nums">₹{(c.mrr / 1000).toFixed(0)}k</p>
                <p className="text-[11px] text-ink-500">MRR</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between gap-2">
              <Badge variant="primary">{c.plan}</Badge>
              <span className="text-xs text-primary-600 font-medium flex items-center gap-1 shrink-0">Manage <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" /></span>
            </div>
          </button>
        ))}
      </div>
      <Modal open={!!selected} onClose={() => { setSelected(null); setIsEditing(false); }} title={isEditing ? "Edit Client" : "Client Details"} size="lg">
        {selected && !isEditing && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img src={selected.logo} alt="" className="w-16 h-16 rounded-xl bg-ink-100 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-xl font-semibold font-display text-ink-950 truncate">{selected.name}</h3>
                <p className="text-sm text-ink-500">{selected.type} · {selected.plan} Plan · Joined {selected.joinedDate}</p>
              </div>
              <div className="ml-auto shrink-0"><StatusBadge status={selected.status} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-control border border-ink-200 bg-ink-50 p-4 text-center"><p className="text-2xl font-semibold text-ink-900 tabular-nums">{selected.students}</p><p className="text-xs text-ink-500 mt-0.5">Students</p></div>
              <div className="rounded-control border border-ink-200 bg-ink-50 p-4 text-center"><p className="text-2xl font-semibold text-ink-900 tabular-nums">{selected.teachers}</p><p className="text-xs text-ink-500 mt-0.5">Teachers</p></div>
              <div className="rounded-control border border-ink-200 bg-ink-50 p-4 text-center"><p className="text-2xl font-semibold text-ink-900 tabular-nums">₹{(selected.mrr / 1000).toFixed(0)}k</p><p className="text-xs text-ink-500 mt-0.5">Monthly Revenue</p></div>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-700 mb-2">Active Features</p>
              <div className="flex flex-wrap gap-2">
                {featureCatalog.map((f) => (
                  <div key={f.key} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-control text-xs font-medium border', selected.features[f.key] ? 'bg-success-50 text-success-700 border-success-100' : 'bg-ink-50 text-ink-500 border-ink-200')}>
                    {selected.features[f.key] ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <span className="w-3.5 h-3.5 rounded-full border border-ink-300 shrink-0" aria-hidden="true" />}
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-4 gap-2">
              <button className="btn-secondary text-error-600 hover:bg-error-50 hover:border-error-200" onClick={() => {
                setLocalClients(localClients.filter(c => c.id !== selected.id));
                setSelected(null);
              }}>Delete Client</button>
              <button className="btn-secondary" onClick={() => setIsEditing(true)}>Edit Client</button>
            </div>
          </div>
        )}
        {selected && isEditing && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const updated = {
              ...selected,
              name: fd.get('name') as string,
              plan: fd.get('plan') as Client['plan'],
              status: fd.get('status') as Client['status']
            };
            setLocalClients(localClients.map(c => c.id === selected.id ? updated : c));
            setSelected(updated);
            setIsEditing(false);
          }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Client Name</label>
                <input name="name" required className="input" defaultValue={selected.name} />
              </div>
              <div>
                <label className="label">Plan</label>
                <select name="plan" className="input" defaultValue={selected.plan}>
                  <option value="Starter">Starter</option>
                  <option value="Growth">Growth</option>
                  <option value="Enterprise">Enterprise</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select name="status" className="input" defaultValue={selected.status}>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="churned">Churned</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={isAdding} onClose={() => setIsAdding(false)} title="Add New Client" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const newClient: Client = {
            id: `client-${Date.now()}`,
            name: fd.get('name') as string,
            type: fd.get('type') as Client['type'],
            plan: fd.get('plan') as Client['plan'],
            status: fd.get('status') as Client['status'],
            students: Number(fd.get('students')),
            teachers: 0,
            mrr: 0,
            logo: 'https://api.dicebear.com/7.x/initials/svg?seed=' + fd.get('name'),
            features: {},
            joinedDate: new Date().toISOString().split('T')[0],
          };
          setLocalClients([newClient, ...localClients]);
          setIsAdding(false);
        }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Client Name</label>
              <input name="name" required className="input" placeholder="Institution Name" />
            </div>
            <div>
              <label className="label">Type</label>
              <select name="type" className="input">
                <option value="School">School</option>
                <option value="College">College</option>
                <option value="Training Center">Coaching Center</option>
              </select>
            </div>
            <div>
              <label className="label">Plan</label>
              <select name="plan" className="input">
                <option value="Starter">Starter</option>
                <option value="Growth">Growth</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" className="input">
                <option value="active">Active</option>
                <option value="trial">Trial</option>
              </select>
            </div>
            <div>
              <label className="label">Initial Students</label>
              <input name="students" className="input" type="number" defaultValue="0" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Add Client</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function PlansPricing() {
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [localClients, setLocalClients] = useState(clients);

  const [localPlans, setLocalPlans] = useState([
    { name: 'Starter', price: '₹4,999', period: '/month', students: 'Up to 200', features: ['Razorpay payments', 'Google Calendar', 'Basic reports', 'Email support'], color: 'ink', popular: false },
    { name: 'Growth', price: '₹14,999', period: '/month', students: 'Up to 1,000', features: ['Everything in Starter', 'Zoom integration', 'WhatsApp automation', 'AI exam generator', 'Certification courses', 'Priority support'], color: 'primary', popular: true },
    { name: 'Enterprise', price: '₹39,999', period: '/month', students: 'Unlimited', features: ['Everything in Growth', 'Biometric attendance', 'White-label branding', 'Custom integrations', 'Dedicated manager', 'SLA guarantee'], color: 'accent', popular: false },
  ]);
  
  return (
    <div>
      <PageHeader title="Plans & Pricing" subtitle="Manage subscription plans for clients" actions={<button className="btn-primary" onClick={() => setIsCreatingCustom(true)}><Plus className="w-4 h-4" /> Create Custom Plan</button>} />
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {localPlans.map((plan) => (
          <div key={plan.name} className={cn('card p-6 relative', plan.popular && 'ring-2 ring-primary-500')}>
            {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-primary-600 text-white px-3 py-1 text-xs shadow-sm">Most Popular</div>}
            <div className="flex items-center gap-2 mb-1">
              <Star className={cn('w-5 h-5 shrink-0', plan.popular ? 'text-primary-600' : 'text-ink-400')} aria-hidden="true" />
              <h3 className="text-lg font-semibold font-display text-ink-950">{plan.name}</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-semibold font-display text-ink-950 tabular-nums">{plan.price}</span>
              <span className="text-sm text-ink-500">{plan.period}</span>
            </div>
            <p className="text-sm text-ink-500 mb-5">{plan.students} students</p>
            <div className="space-y-2.5 mb-6">
              {plan.features.map((f) => (
                <div key={f} className="flex items-start gap-2 text-sm leading-6 text-ink-600">
                  <Check className="w-4 h-4 mt-1 text-success-600 shrink-0" aria-hidden="true" /> {f}
                </div>
              ))}
            </div>
            <button className={cn('w-full', plan.popular ? 'btn-primary' : 'btn-secondary')} onClick={() => setEditingPlan(plan.name)}>Edit Plan</button>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader title="Custom Plans" subtitle="Tailored plans created for specific clients" />
        <div className="p-5 space-y-3">
          {localClients.filter((c) => c.plan === 'Custom').map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-control border border-ink-200 bg-ink-50">
              <div className="flex items-center gap-3 min-w-0">
                <img src={c.logo} alt="" className="w-10 h-10 rounded-control bg-white border border-ink-200 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-ink-800 truncate">{c.name}</p>
                  <p className="text-xs text-ink-500 mt-0.5 tabular-nums">{c.students} students · {c.teachers} teachers</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="accent">Custom</Badge>
                <span className="text-sm font-semibold text-ink-800 tabular-nums">₹{(c.mrr / 1000).toFixed(0)}k/mo</span>
                <button className="btn-ghost text-sm" onClick={() => setEditingPlan(`Custom - ${c.name}`)}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={isCreatingCustom} onClose={() => setIsCreatingCustom(false)} title="Create Custom Plan" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const clientId = fd.get('clientId') as string;
          setLocalClients(localClients.map(c => c.id === clientId ? { ...c, plan: 'Custom', mrr: Number(fd.get('mrr')), students: Number(fd.get('students')) } : c));
          setIsCreatingCustom(false);
        }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Client Name</label>
              <select name="clientId" className="input">
                {localClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Monthly Price (MRR)</label>
              <input name="mrr" type="number" required className="input" placeholder="e.g. 25000" />
            </div>
            <div>
              <label className="label">Max Students</label>
              <input name="students" type="number" required className="input" placeholder="e.g. 5000" />
            </div>
          </div>
          <div>
            <label className="label mb-2 block">Included Features</label>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto scrollbar-thin p-2 border border-ink-200 rounded-control">
              {featureCatalog.map(f => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer hover:bg-ink-50 px-1.5 py-1 rounded-md transition-colors">
                  <input type="checkbox" className="rounded-sm border-ink-300 text-primary-600 focus:ring-primary-500/40 focus:ring-offset-0" defaultChecked />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setIsCreatingCustom(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create Plan</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingPlan} onClose={() => setEditingPlan(null)} title={`Edit Plan: ${editingPlan}`} size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const price = fd.get('price') as string;
          const students = fd.get('students') as string;
          
          if (editingPlan?.startsWith('Custom - ')) {
            const clientName = editingPlan.replace('Custom - ', '');
            setLocalClients(localClients.map(c => 
              c.name === clientName 
                ? { ...c, mrr: Number(price.replace(/[^0-9]/g, '')), students: Number(students) } 
                : c
            ));
          } else {
            setLocalPlans(localPlans.map(p => 
              p.name === editingPlan 
                ? { ...p, price, students } 
                : p
            ));
          }
          setEditingPlan(null);
        }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monthly Price</label>
              <input name="price" required className="input" placeholder="e.g. ₹4,999 or 25000" />
            </div>
            <div>
              <label className="label">Student Limit</label>
              <input name="students" required className="input" placeholder="e.g. Up to 200 or 5000" />
            </div>
          </div>
          <div>
            <label className="label mb-2 block">Update Features</label>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto scrollbar-thin p-2 border border-ink-200 rounded-control">
              {featureCatalog.map(f => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer hover:bg-ink-50 px-1.5 py-1 rounded-md transition-colors">
                  <input type="checkbox" className="rounded-sm border-ink-300 text-primary-600 focus:ring-primary-500/40 focus:ring-offset-0" defaultChecked />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditingPlan(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function FeatureToggles() {
  const [selectedClient, setSelectedClient] = useState(clients[0].id);
  const client = clients.find((c) => c.id === selectedClient)!;
  const [toggles, setToggles] = useState(client.features);

  const handleClientChange = (id: string) => {
    setSelectedClient(id);
    setToggles(clients.find((c) => c.id === id)!.features);
  };

  return (
    <div>
      <PageHeader title="Feature Toggles" subtitle="Enable or disable features per client based on their requirements" />
      <div className="mb-6 max-w-xs">
        <Select
          label="Client"
          value={selectedClient}
          onChange={handleClientChange}
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {featureCatalog.map((f) => {
          const Icon = iconMap[f.icon] || ToggleLeft;
          const enabled = toggles[f.key];
          return (
            <div key={f.key} className="card p-5 flex items-start gap-4">
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', enabled ? 'bg-primary-50' : 'bg-ink-100')}>
                <Icon className={cn('w-5 h-5', enabled ? 'text-primary-600' : 'text-ink-400')} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-ink-900">{f.label}</h3>
                <p className="text-sm leading-6 text-ink-500 mt-0.5">{f.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`${f.label} — ${enabled ? 'enabled' : 'disabled'}`}
                onClick={() => setToggles({ ...toggles, [f.key]: !enabled })}
                className={cn('w-11 h-6 rounded-full transition-colors relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white', enabled ? 'bg-primary-600' : 'bg-ink-300')}
              >
                <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-150', enabled ? 'translate-x-5' : 'translate-x-0')} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WhiteLabel() {
  const [selectedClient, setSelectedClient] = useState(clients[0].id);
  const client = clients.find((c) => c.id === selectedClient)!;
  const [productName, setProductName] = useState(`Skill Toss — ${client.name}`);
  const [poweredBy, setPoweredBy] = useState(client.name);
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [footerText, setFooterText] = useState(`© 2026 ${client.name}. Powered by Skill Toss.`);
  const [saveStatus, setSaveStatus] = useState('Save Branding');
  const [customLogo, setCustomLogo] = useState('');

  return (
    <div>
      <PageHeader title="White-Label Customization" subtitle="Customize branding, logo & product name for each client" />
      <div className="mb-6 max-w-xs">
        <Select label="Client" value={selectedClient} onChange={setSelectedClient} options={clients.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-semibold text-ink-900 mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-primary-600" aria-hidden="true" /> Branding Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="wl-product-name">Product Name</label>
              <input id="wl-product-name" className="input" value={productName} onChange={e => setProductName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="wl-powered-by">Powered By Text</label>
              <input id="wl-powered-by" className="input" value={poweredBy} onChange={e => setPoweredBy(e.target.value)} />
            </div>
            <div>
              <p className="label">Primary Color</p>
              <div className="flex gap-2">
                {['#2563eb', '#0891b2', '#16a34a', '#d97706', '#dc2626'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    style={{ backgroundColor: c }}
                    aria-label={`Use ${c} as the primary color`}
                    aria-pressed={primaryColor === c}
                    onClick={() => setPrimaryColor(c)}
                    className={cn('w-10 h-10 rounded-control ring-offset-2 ring-offset-white transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40', primaryColor === c ? 'ring-2 ring-ink-900' : 'ring-2 ring-transparent hover:ring-ink-300')}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="label">Logo</label>
              <div className="flex items-center gap-3">
                <img src={customLogo || client.logo} alt="" className="w-14 h-14 rounded-xl bg-ink-100 border border-ink-200 object-cover shrink-0" />
                <label className="btn-secondary cursor-pointer focus-within:ring-2 focus-within:ring-primary-500/40 focus-within:ring-offset-2 focus-within:ring-offset-white">
                  Upload New
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCustomLogo(URL.createObjectURL(e.target.files[0]));
                    }
                  }} />
                </label>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="wl-footer-text">Footer Text</label>
              <input id="wl-footer-text" className="input" value={footerText} onChange={e => setFooterText(e.target.value)} />
            </div>
            <button 
              className={cn("w-full transition-colors", saveStatus === 'Saved!' ? 'btn-primary bg-success-600 border-success-600 hover:bg-success-700' : 'btn-primary')} 
              onClick={() => {
                setSaveStatus('Saved!');
                setTimeout(() => setSaveStatus('Save Branding'), 2000);
              }}
            >
              {saveStatus}
            </button>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-ink-900 mb-4">Live Preview</h3>
          <div className="rounded-card border border-ink-200 overflow-hidden">
            <div className="h-32 flex items-center justify-center transition-colors" style={{ backgroundColor: primaryColor }}>
              <div className="text-center text-white px-4">
                <img src={customLogo || client.logo} alt="" className="w-12 h-12 rounded-control bg-white/20 mx-auto mb-2 object-cover" />
                <p className="font-semibold font-display truncate">{productName}</p>
                <p className="text-xs opacity-80 truncate">Powered by {poweredBy}</p>
              </div>
            </div>
            <div className="p-4 space-y-2" aria-hidden="true">
              <div className="h-8 bg-ink-100 rounded-control w-3/4" />
              <div className="h-8 bg-ink-100 rounded-control w-1/2" />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-ink-50 border border-ink-100 rounded-control" />)}
              </div>
            </div>
            <p className="px-4 pb-4 text-center text-xs text-ink-500">{footerText}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function CustomerSupport() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [localTickets, setLocalTickets] = useState(supportTickets);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');

  const filteredTickets = localTickets.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openTickets = localTickets.filter(t => t.status === 'Open').length;
  const inProgress = localTickets.filter(t => t.status === 'In Progress').length;
  const critical = localTickets.filter(t => t.priority === 'High' && t.status !== 'Resolved').length;

  return (
    <div>
      <PageHeader title="Customer Support Helpdesk" subtitle="Manage incoming issues and tickets from institutions" actions={<button className="btn-primary" onClick={() => setIsCreatingTicket(true)}><Plus className="w-4 h-4" /> Create Ticket</button>} />
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open Tickets" value={openTickets} icon={MessagesSquare} color="primary" />
        <StatCard label="In Progress" value={inProgress} icon={Clock} color="warning" />
        <StatCard label="Critical Issues" value={critical} icon={AlertTriangle} color="error" />
        <StatCard label="Avg Response" value="1.4h" icon={TrendingUp} color="success" />
      </div>

      <Card>
        <CardHeader title="All Tickets" action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search tickets"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="input pl-9 w-full sm:w-64"
            />
          </div>
        } />
        <DataTable 
          data={filteredTickets}
          columns={[
            { key: 'id', label: 'ID', render: (t) => <span className="font-mono text-xs text-ink-600 whitespace-nowrap">{t.id}</span> },
            { key: 'client', label: 'Client', render: (t) => <span className="font-medium text-ink-800">{t.clientName}</span> },
            { key: 'subject', label: 'Subject', render: (t) => <span className="text-sm truncate max-w-xs block" title={t.subject}>{t.subject}</span> },
            { key: 'priority', label: 'Priority', render: (t) => <Badge variant={t.priority === 'High' ? 'error' : t.priority === 'Medium' ? 'warning' : 'success'}>{t.priority}</Badge> },
            { key: 'status', label: 'Status', render: (t) => <Badge variant={t.status === 'Resolved' ? 'success' : t.status === 'Open' ? 'primary' : 'warning'}>{t.status}</Badge> },
            { key: 'date', label: 'Created', render: (t) => <span className="text-sm tabular-nums whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</span> },
            { key: 'actions', label: '', render: (t) => <button onClick={() => setSelectedTicket(t)} className="btn-secondary py-1 px-3 text-xs whitespace-nowrap">View Thread</button> }
          ]}
        />
      </Card>

      <Modal open={!!selectedTicket} onClose={() => setSelectedTicket(null)} title={`Ticket: ${selectedTicket?.id}`} size="xl">
        {selectedTicket && (
          <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
            <div className="lg:col-span-2 flex flex-col h-full border border-ink-200 rounded-card bg-ink-50 overflow-hidden">
              <div className="p-4 bg-white border-b border-ink-200">
                <h3 className="font-semibold text-ink-900 text-lg">{selectedTicket.subject}</h3>
                <p className="text-sm text-ink-500 mt-1">Opened on {new Date(selectedTicket.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {selectedTicket.messages.map((m: TicketMessage) => (
                  <div key={m.id} className={cn("flex gap-3", m.sender === 'support' ? 'flex-row-reverse' : '')}>
                    {m.sender === 'support' && m.avatar ? (
                      <img src={m.avatar} alt="" className="w-8 h-8 rounded-full shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-ink-200 flex items-center justify-center text-ink-600 font-semibold text-xs shrink-0" aria-hidden="true">
                        {m.name.charAt(0)}
                      </div>
                    )}
                    <div className={cn("max-w-[75%] rounded-2xl p-3 text-sm leading-6", m.sender === 'support' ? "bg-primary-600 text-white rounded-tr-none" : "bg-white border border-ink-200 text-ink-800 rounded-tl-none")}>
                      <div className="flex justify-between items-baseline mb-1 gap-4">
                        <span className={cn("font-semibold text-xs", m.sender === 'support' ? "text-primary-100" : "text-ink-900")}>{m.name}</span>
                        <span className={cn("text-[11px] tabular-nums shrink-0", m.sender === 'support' ? "text-primary-200" : "text-ink-500")}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-white border-t border-ink-200">
                <form 
                  className="flex gap-2"
                  onSubmit={e => {
                    e.preventDefault();
                    if (!replyText.trim()) return;
                    
                    const updatedTicket = {
                      ...selectedTicket,
                      status: selectedTicket.status === 'Open' ? 'In Progress' as const : selectedTicket.status,
                      messages: [
                        ...selectedTicket.messages, 
                        {
                          id: `msg-${Date.now()}`,
                          sender: 'support' as const,
                          name: 'Support Agent',
                          avatar: 'https://i.pravatar.cc/150?u=support',
                          message: replyText,
                          timestamp: new Date().toISOString()
                        }
                      ]
                    };
                    
                    setLocalTickets(localTickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
                    setSelectedTicket(updatedTicket);
                    setReplyText('');
                  }}
                >
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    aria-label="Reply to client"
                    className="input flex-1 resize-none"
                    placeholder="Type your reply to the client..."
                  />
                  <button type="submit" className="btn-primary shrink-0 self-end px-3" disabled={!replyText.trim()} title="Send reply" aria-label="Send reply"><Send className="w-4 h-4" aria-hidden="true" /></button>
                </form>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="p-4 shadow-none border-ink-200">
                <h4 className="font-semibold text-ink-500 mb-3 text-xs uppercase tracking-[0.08em]">Client Context</h4>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-ink-500 text-xs">Institution</dt>
                    <dd className="font-medium text-ink-900 mt-0.5">{selectedTicket.clientName}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-500 text-xs">Current Plan</dt>
                    <dd className="mt-1"><Badge variant="primary">Enterprise</Badge></dd>
                  </div>
                  <div>
                    <dt className="text-ink-500 text-xs">MRR</dt>
                    <dd className="font-semibold text-ink-900 text-lg tabular-nums mt-0.5">₹39k/mo</dd>
                  </div>
                </dl>
              </Card>

              <Card className="p-4 shadow-none border-ink-200">
                <h4 className="font-semibold text-ink-500 mb-3 text-xs uppercase tracking-[0.08em]">Ticket Actions</h4>
                <div className="space-y-2">
                  <button
                    className="btn-secondary w-full justify-start text-sm"
                    onClick={() => {
                      const updated = { ...selectedTicket, status: 'Resolved' as const };
                      setLocalTickets(localTickets.map(t => t.id === selectedTicket.id ? updated : t));
                      setSelectedTicket(updated);
                    }}
                  >
                    <Check className="w-4 h-4" aria-hidden="true" /> Mark as Resolved
                  </button>
                  <button
                    className="btn-secondary w-full justify-start text-sm text-error-600 hover:bg-error-50 hover:border-error-200"
                    onClick={() => {
                      const updated = { ...selectedTicket, priority: 'High' as const };
                      setLocalTickets(localTickets.map(t => t.id === selectedTicket.id ? updated : t));
                      setSelectedTicket(updated);
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Escalate to Engineering
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={isCreatingTicket} onClose={() => setIsCreatingTicket(false)} title="Create New Ticket" size="md">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const clientId = fd.get('clientId') as string;
          const client = clients.find(c => c.id === clientId);
          const newTicket: Ticket = {
            id: `TCK-${Math.floor(Math.random() * 10000)}`,
            clientId: clientId,
            clientName: client?.name || 'Unknown',
            subject: fd.get('subject') as string,
            status: 'Open',
            priority: fd.get('priority') as Ticket['priority'],
            createdAt: new Date().toISOString(),
            messages: [{
              id: `msg-${Date.now()}`,
              sender: 'client',
              name: client?.name || 'Unknown',
              message: fd.get('message') as string,
              timestamp: new Date().toISOString()
            }]
          };
          setLocalTickets([newTicket, ...localTickets]);
          setIsCreatingTicket(false);
        }}>
          <div>
            <label className="label">Client</label>
            <select name="clientId" className="input">
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject</label>
            <input name="subject" required className="input" placeholder="e.g. Issue with billing" />
          </div>
          <div>
            <label className="label">Priority</label>
            <select name="priority" className="input">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="label">Initial Message</label>
            <textarea name="message" required className="input" rows={4} placeholder="Describe the issue..."></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setIsCreatingTicket(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create Ticket</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export { AiFeatureLab, SystemHealthMap, SlaDashboard, RoadmapManager, WorkflowAutomation, IntegrationHub } from './ProductAdminAddons';
