import {
  Building2, TrendingUp, Users, Inbox, Check, Clock, Star,
  ArrowUpRight, Video, CreditCard, MessageCircle, Calendar, Sparkles,
  Fingerprint, Award, MessagesSquare, Palette, ToggleLeft, Plus, Search,
  AlertTriangle, Send
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
  Video, CreditCard, MessageCircle, Calendar, Sparkles, Fingerprint, Award, MessagesSquare,
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
        <StatCard label="Total MRR" value={`₹${(totalMRR / 1000).toFixed(0)}k`} icon={TrendingUp} trend={18} trendLabel="vs last month" color="primary" />
        <StatCard label="Active Clients" value={activeClients} icon={Building2} trend={12} trendLabel="2 new this month" color="success" />
        <StatCard label="Trial Clients" value={trialClients} icon={Clock} trendLabel="Converting soon" color="warning" />
        <StatCard label="Total Students" value={totalStudents.toLocaleString()} icon={Users} trend={8} trendLabel="across all clients" color="accent" />
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
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50 transition">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 truncate">{d.organization}</p>
                  <p className="text-xs text-ink-400">{d.type} · {d.date}</p>
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
                <img src={c.logo} alt={c.name} className="w-8 h-8 rounded-lg bg-ink-100" />
                <div>
                  <p className="font-medium text-ink-800">{c.name}</p>
                  <p className="text-xs text-ink-400">{c.type}</p>
                </div>
              </div>
            ) },
            { key: 'plan', label: 'Plan', render: (c) => <Badge variant="primary">{c.plan}</Badge> },
            { key: 'students', label: 'Students', render: (c) => c.students.toLocaleString() },
            { key: 'teachers', label: 'Teachers', render: (c) => c.teachers },
            { key: 'mrr', label: 'MRR', render: (c) => `₹${(c.mrr / 1000).toFixed(0)}k` },
            { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
            { key: 'features', label: 'Features', render: (c) => (
              <div className="flex gap-1">
                {Object.entries(c.features).filter(([, v]) => v).map(([k]) => {
                  const Icon = iconMap[k] || ToggleLeft;
                  return <div key={k} className="p-1 rounded bg-primary-50"><Icon className="w-3.5 h-3.5 text-primary-600" /></div>;
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
  return (
    <div>
      <PageHeader title="Demo Requests" subtitle="Inbound leads from schools, colleges & training institutes" actions={<button className="btn-primary"><Plus className="w-4 h-4" /> Add Request</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="New" value={demoRequests.filter((d) => d.status === 'new').length} icon={Inbox} color="primary" />
        <StatCard label="Contacted" value={demoRequests.filter((d) => d.status === 'contacted').length} icon={MessageCircle} color="accent" />
        <StatCard label="Demo Scheduled" value={demoRequests.filter((d) => d.status === 'demo-scheduled').length} icon={Calendar} color="warning" />
        <StatCard label="Conversion Rate" value="68%" icon={TrendingUp} trend={5} color="success" />
      </div>
      <Card>
        <DataTable<DemoRequest>
          columns={[
            { key: 'organization', label: 'Organization', render: (d) => (
              <div>
                <p className="font-medium text-ink-800">{d.organization}</p>
                <p className="text-xs text-ink-400">{d.type}</p>
              </div>
            ) },
            { key: 'contact', label: 'Contact', render: (d) => (
              <div>
                <p className="text-ink-700">{d.contact}</p>
                <p className="text-xs text-ink-400">{d.email}</p>
              </div>
            ) },
            { key: 'phone', label: 'Phone' },
            { key: 'date', label: 'Requested' },
            { key: 'notes', label: 'Notes', render: (d) => <span className="text-xs text-ink-500 max-w-xs truncate block">{d.notes}</span> },
            { key: 'status', label: 'Status', render: (d) => <StatusBadge status={d.status} /> },
          ]}
          data={demoRequests}
          onRowClick={setSelected}
        />
      </Card>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Demo Request Details" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-ink-900 text-lg">{selected.organization}</h3>
                <p className="text-sm text-ink-500">{selected.type}</p>
              </div>
              <div className="ml-auto"><StatusBadge status={selected.status} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-ink-400">Contact Person</p><p className="font-medium text-ink-800">{selected.contact}</p></div>
              <div><p className="text-ink-400">Email</p><p className="font-medium text-ink-800">{selected.email}</p></div>
              <div><p className="text-ink-400">Phone</p><p className="font-medium text-ink-800">{selected.phone}</p></div>
              <div><p className="text-ink-400">Date</p><p className="font-medium text-ink-800">{selected.date}</p></div>
            </div>
            <div><p className="text-ink-400 text-sm mb-1">Notes</p><p className="text-sm text-ink-700 bg-ink-50 rounded-xl p-3">{selected.notes}</p></div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1">Schedule Demo</button>
              <button className="btn-secondary">Mark Contacted</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function Clients() {
  const [selected, setSelected] = useState<Client | null>(null);
  return (
    <div>
      <PageHeader title="Clients" subtitle="All institutions using Skill Toss" actions={
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input placeholder="Search clients..." className="pl-9 pr-4 py-2.5 text-sm bg-white border border-ink-200 rounded-xl focus:outline-none focus:border-primary-500 w-48" />
          </div>
          <button className="btn-primary"><Plus className="w-4 h-4" /> Add Client</button>
        </>
      } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <button key={c.id} onClick={() => setSelected(c)} className="card card-hover p-5 text-left">
            <div className="flex items-start justify-between mb-4">
              <img src={c.logo} alt={c.name} className="w-12 h-12 rounded-xl bg-ink-100" />
              <StatusBadge status={c.status} />
            </div>
            <h3 className="font-semibold text-ink-900">{c.name}</h3>
            <p className="text-xs text-ink-400 mb-3">{c.type} · Joined {c.joinedDate}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-ink-50 rounded-lg py-2">
                <p className="text-lg font-bold text-ink-900">{c.students}</p>
                <p className="text-[10px] text-ink-400">Students</p>
              </div>
              <div className="bg-ink-50 rounded-lg py-2">
                <p className="text-lg font-bold text-ink-900">{c.teachers}</p>
                <p className="text-[10px] text-ink-400">Teachers</p>
              </div>
              <div className="bg-ink-50 rounded-lg py-2">
                <p className="text-lg font-bold text-ink-900">₹{(c.mrr / 1000).toFixed(0)}k</p>
                <p className="text-[10px] text-ink-400">MRR</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Badge variant="primary">{c.plan}</Badge>
              <span className="text-xs text-primary-600 font-medium flex items-center gap-1">Manage <ArrowUpRight className="w-3 h-3" /></span>
            </div>
          </button>
        ))}
      </div>
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Client Details" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img src={selected.logo} alt={selected.name} className="w-16 h-16 rounded-xl bg-ink-100" />
              <div>
                <h3 className="text-xl font-bold font-display text-ink-900">{selected.name}</h3>
                <p className="text-sm text-ink-500">{selected.type} · {selected.plan} Plan · Joined {selected.joinedDate}</p>
              </div>
              <div className="ml-auto"><StatusBadge status={selected.status} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">{selected.students}</p><p className="text-xs text-ink-400">Students</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">{selected.teachers}</p><p className="text-xs text-ink-400">Teachers</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">₹{(selected.mrr / 1000).toFixed(0)}k</p><p className="text-xs text-ink-400">Monthly Revenue</p></div>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-700 mb-2">Active Features</p>
              <div className="flex flex-wrap gap-2">
                {featureCatalog.map((f) => (
                  <div key={f.key} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium', selected.features[f.key] ? 'bg-success-50 text-success-700' : 'bg-ink-100 text-ink-400')}>
                    {selected.features[f.key] ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full bg-ink-300" />}
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function PlansPricing() {
  const plans = [
    { name: 'Starter', price: '₹4,999', period: '/month', students: 'Up to 200', features: ['Razorpay payments', 'Google Calendar', 'Basic reports', 'Email support'], color: 'ink', popular: false },
    { name: 'Growth', price: '₹14,999', period: '/month', students: 'Up to 1,000', features: ['Everything in Starter', 'Zoom integration', 'WhatsApp automation', 'AI exam generator', 'Certification courses', 'Priority support'], color: 'primary', popular: true },
    { name: 'Enterprise', price: '₹39,999', period: '/month', students: 'Unlimited', features: ['Everything in Growth', 'Biometric attendance', 'White-label branding', 'Custom integrations', 'Dedicated manager', 'SLA guarantee'], color: 'accent', popular: false },
  ];
  return (
    <div>
      <PageHeader title="Plans & Pricing" subtitle="Manage subscription plans for clients" actions={<button className="btn-primary"><Plus className="w-4 h-4" /> Create Custom Plan</button>} />
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        {plans.map((plan) => (
          <div key={plan.name} className={cn('card p-6 relative', plan.popular && 'ring-2 ring-primary-500')}>
            {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-primary-600 text-white px-3 py-1 text-xs">Most Popular</div>}
            <div className="flex items-center gap-2 mb-1">
              <Star className={cn('w-5 h-5', plan.popular ? 'text-primary-600' : 'text-ink-400')} />
              <h3 className="text-lg font-bold font-display text-ink-900">{plan.name}</h3>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold font-display text-ink-900">{plan.price}</span>
              <span className="text-sm text-ink-400">{plan.period}</span>
            </div>
            <p className="text-sm text-ink-500 mb-4">{plan.students} students</p>
            <div className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-ink-600">
                  <Check className="w-4 h-4 text-success-500 shrink-0" /> {f}
                </div>
              ))}
            </div>
            <button className={cn('w-full', plan.popular ? 'btn-primary' : 'btn-secondary')}>Edit Plan</button>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader title="Custom Plans" subtitle="Tailored plans created for specific clients" />
        <div className="p-5 space-y-3">
          {clients.filter((c) => c.plan === 'Custom').map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-ink-50 rounded-xl">
              <div className="flex items-center gap-3">
                <img src={c.logo} alt={c.name} className="w-10 h-10 rounded-lg bg-white" />
                <div>
                  <p className="font-medium text-ink-800">{c.name}</p>
                  <p className="text-xs text-ink-400">{c.students} students · {c.teachers} teachers</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="accent">Custom</Badge>
                <span className="text-sm font-semibold text-ink-800">₹{(c.mrr / 1000).toFixed(0)}k/mo</span>
                <button className="btn-ghost text-sm">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
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
                <Icon className={cn('w-5 h-5', enabled ? 'text-primary-600' : 'text-ink-400')} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-ink-900">{f.label}</h3>
                <p className="text-sm text-ink-500 mt-0.5">{f.desc}</p>
              </div>
              <button
                onClick={() => setToggles({ ...toggles, [f.key]: !enabled })}
                className={cn('relative w-12 h-6 rounded-full transition-colors shrink-0', enabled ? 'bg-primary-600' : 'bg-ink-200')}
              >
                <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform', enabled ? 'translate-x-6' : 'translate-x-0.5')} />
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
  return (
    <div>
      <PageHeader title="White-Label Customization" subtitle="Customize branding, logo & product name for each client" />
      <div className="mb-6 max-w-xs">
        <Select value={selectedClient} onChange={setSelectedClient} options={clients.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <h3 className="font-semibold text-ink-900 mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-primary-600" /> Branding Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Product Name</label>
              <input className="input" defaultValue={`Skill Toss — ${client.name}`} />
            </div>
            <div>
              <label className="label">Powered By Text</label>
              <input className="input" defaultValue={client.name} />
            </div>
            <div>
              <label className="label">Primary Color</label>
              <div className="flex gap-2">
                {['#2563eb', '#0891b2', '#16a34a', '#d97706', '#dc2626'].map((c) => (
                  <button key={c} style={{ backgroundColor: c }} className="w-10 h-10 rounded-xl ring-2 ring-offset-2 ring-transparent hover:ring-ink-200 transition" />
                ))}
              </div>
            </div>
            <div>
              <label className="label">Logo</label>
              <div className="flex items-center gap-3">
                <img src={client.logo} alt="logo" className="w-14 h-14 rounded-xl bg-ink-100" />
                <button className="btn-secondary">Upload New</button>
              </div>
            </div>
            <div>
              <label className="label">Footer Text</label>
              <input className="input" defaultValue={`© 2026 ${client.name}. Powered by Skill Toss.`} />
            </div>
            <button className="btn-primary w-full">Save Branding</button>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-ink-900 mb-4">Live Preview</h3>
          <div className="rounded-xl border border-ink-200 overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
              <div className="text-center text-white">
                <img src={client.logo} alt="logo" className="w-12 h-12 rounded-xl bg-white/20 mx-auto mb-2" />
                <p className="font-bold font-display">{client.name}</p>
                <p className="text-xs text-primary-100">Powered by Skill Toss</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="h-8 bg-ink-100 rounded-lg w-3/4" />
              <div className="h-8 bg-ink-100 rounded-lg w-1/2" />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-ink-50 rounded-lg" />)}
              </div>
              <div className="text-center text-xs text-ink-400 mt-3">© 2026 {client.name}. Powered by Skill Toss.</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function CustomerSupport() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const openTickets = supportTickets.filter(t => t.status === 'Open').length;
  const inProgress = supportTickets.filter(t => t.status === 'In Progress').length;
  const critical = supportTickets.filter(t => t.priority === 'High' && t.status !== 'Resolved').length;

  return (
    <div>
      <PageHeader title="Customer Support Helpdesk" subtitle="Manage incoming issues and tickets from institutions" actions={<button className="btn-primary"><Plus className="w-4 h-4" /> Create Ticket</button>} />
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open Tickets" value={openTickets} icon={MessagesSquare} color="primary" />
        <StatCard label="In Progress" value={inProgress} icon={Clock} color="warning" />
        <StatCard label="Critical Issues" value={critical} icon={AlertTriangle} color="error" />
        <StatCard label="Avg Response" value="1.4h" icon={TrendingUp} color="success" />
      </div>

      <Card>
        <CardHeader title="All Tickets" action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input placeholder="Search tickets..." className="pl-9 pr-4 py-2.5 text-sm bg-white border border-ink-200 rounded-xl focus:outline-none focus:border-primary-500 w-64" />
          </div>
        } />
        <DataTable 
          data={supportTickets}
          columns={[
            { key: 'id', label: 'ID', render: (t) => <span className="font-mono text-xs text-ink-600">{t.id}</span> },
            { key: 'client', label: 'Client', render: (t) => <span className="font-medium text-ink-900">{t.clientName}</span> },
            { key: 'subject', label: 'Subject', render: (t) => <span className="text-sm truncate max-w-xs block">{t.subject}</span> },
            { key: 'priority', label: 'Priority', render: (t) => <Badge variant={t.priority === 'High' ? 'error' : t.priority === 'Medium' ? 'warning' : 'success'}>{t.priority}</Badge> },
            { key: 'status', label: 'Status', render: (t) => <Badge variant={t.status === 'Resolved' ? 'success' : t.status === 'Open' ? 'primary' : 'warning'}>{t.status}</Badge> },
            { key: 'date', label: 'Created', render: (t) => <span className="text-sm">{new Date(t.createdAt).toLocaleDateString()}</span> },
            { key: 'actions', label: '', render: (t) => <button onClick={() => setSelectedTicket(t)} className="btn-secondary py-1 px-3 text-xs">View Thread</button> }
          ]}
        />
      </Card>

      <Modal open={!!selectedTicket} onClose={() => setSelectedTicket(null)} title={`Ticket: ${selectedTicket?.id}`} size="xl">
        {selectedTicket && (
          <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
            <div className="lg:col-span-2 flex flex-col h-full border border-ink-200 rounded-xl bg-ink-50 overflow-hidden">
              <div className="p-4 bg-white border-b border-ink-200">
                <h3 className="font-bold text-ink-900 text-lg">{selectedTicket.subject}</h3>
                <p className="text-sm text-ink-500 mt-1">Opened on {new Date(selectedTicket.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {selectedTicket.messages.map((m: TicketMessage) => (
                  <div key={m.id} className={cn("flex gap-3", m.sender === 'support' ? 'flex-row-reverse' : '')}>
                    {m.sender === 'support' && m.avatar ? (
                      <img src={m.avatar} alt="agent" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-ink-200 flex items-center justify-center text-ink-600 font-bold text-xs shrink-0">
                        {m.name.charAt(0)}
                      </div>
                    )}
                    <div className={cn("max-w-[75%] rounded-2xl p-3 text-sm", m.sender === 'support' ? "bg-primary-600 text-white rounded-tr-none" : "bg-white border border-ink-200 text-ink-800 rounded-tl-none")}>
                      <div className="flex justify-between items-baseline mb-1 gap-4">
                        <span className={cn("font-semibold text-xs", m.sender === 'support' ? "text-primary-100" : "text-ink-900")}>{m.name}</span>
                        <span className={cn("text-[10px]", m.sender === 'support' ? "text-primary-200" : "text-ink-400")}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-white border-t border-ink-200">
                <div className="flex gap-2">
                  <textarea rows={2} className="input flex-1 resize-none" placeholder="Type your reply to the client..." />
                  <button className="btn-primary shrink-0 self-end px-3"><Send className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="p-4 shadow-none border-ink-200">
                <h4 className="font-semibold text-ink-900 mb-3 text-sm uppercase tracking-wider">Client Context</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-ink-500 block text-xs">Institution</span>
                    <span className="font-medium text-ink-900">{selectedTicket.clientName}</span>
                  </div>
                  <div>
                    <span className="text-ink-500 block text-xs">Current Plan</span>
                    <Badge variant="primary" className="mt-1">Enterprise</Badge>
                  </div>
                  <div>
                    <span className="text-ink-500 block text-xs">MRR</span>
                    <span className="font-medium text-ink-900 text-lg">₹39k/mo</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 shadow-none border-ink-200">
                <h4 className="font-semibold text-ink-900 mb-3 text-sm uppercase tracking-wider">Ticket Actions</h4>
                <div className="space-y-2">
                  <button className="btn-secondary w-full justify-start text-sm"><Check className="w-4 h-4 mr-2" /> Mark as Resolved</button>
                  <button className="btn-secondary w-full justify-start text-sm text-error-600 hover:bg-error-50 hover:border-error-200"><AlertTriangle className="w-4 h-4 mr-2" /> Escalate to Engineering</button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
