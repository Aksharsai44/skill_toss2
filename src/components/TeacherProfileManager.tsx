import { useState, useMemo } from 'react';
import {
  User, Mail, Phone, MapPin, Clock, Briefcase, Award, GraduationCap,
  Calendar, Shield, Camera, Edit3, Plus, Trash2, CheckCircle2,
  AlertCircle, Sparkles, Building, BookOpen, Check, Lock, ChevronRight, X
} from 'lucide-react';
import { PageHeader, Card, CardHeader } from '@/components/ui/Layout';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/authContext';
import { useLmsData } from '@/lib/lmsDataContext';
import type { LmsTeacher, TeacherEducation, TeacherExperience, TeacherVisibility } from '@/lib/types';
import { cn } from '@/lib/cn';

export function TeacherProfileManager() {
  const { user, profile } = useAuth();
  const { state, updateTeacherProfile, setFeedback } = useLmsData();

  // Resolve current authenticated teacher profile
  const currentTeacher = useMemo(() => {
    return state.teachers.find(
      (t) =>
        t.id === profile?.id ||
        (user?.email && t.email.toLowerCase() === user.email.toLowerCase()) ||
        (profile?.fullName && (t.email.toLowerCase() === profile.fullName.toLowerCase() || t.name.toLowerCase() === profile.fullName.toLowerCase()))
    ) || state.teachers.find((t) => t.id === 'teacher_001') || state.teachers[0];
  }, [profile, user, state.teachers]);

  const teacherId = currentTeacher?.id || 'teacher_001';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'education' | 'availability' | 'privacy'>('personal');

  // Modal open states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [showEduModal, setShowEduModal] = useState(false);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Editing education/experience items
  const [editingEdu, setEditingEdu] = useState<TeacherEducation | null>(null);
  const [editingExp, setEditingExp] = useState<TeacherExperience | null>(null);

  // Photo state
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  // Form states initialized with real data
  const [personalForm, setPersonalForm] = useState({
    name: currentTeacher?.name || profile?.fullName || 'Sneha Kapoor',
    email: currentTeacher?.email || user?.email || 'sneha@brightfuture.edu',
    phone: currentTeacher?.phone || '+91 90000 11111',
    dob: currentTeacher?.dob || '1990-03-15',
    gender: currentTeacher?.gender || 'Female',
    address: currentTeacher?.address || 'Sector 14, New Delhi',
    emergencyContact: currentTeacher?.emergencyContact || '+91 90000 55555',
  });

  const [professionalForm, setProfessionalForm] = useState({
    employeeId: currentTeacher?.employeeId || 'EMP-CS-104',
    designation: currentTeacher?.designation || 'Assistant Professor',
    department: currentTeacher?.department || 'Computer Science',
    institution: currentTeacher?.institution || 'Bright Future College',
    joiningDate: currentTeacher?.joiningDate || '2016-08-01',
    yearsOfExperience: currentTeacher?.yearsOfExperience || '8+ Years',
    newSubject: '',
    newExpertise: '',
  });

  const [contactForm, setContactForm] = useState({
    officialEmail: currentTeacher?.officialEmail || currentTeacher?.email || 'sneha@brightfuture.edu',
    phone: currentTeacher?.phone || '+91 90000 11111',
    officeLocation: currentTeacher?.officeLocation || 'Block B, Room 304, CS Dept',
    officeHours: currentTeacher?.officeHours || 'Mon–Thu (2:00 PM – 4:00 PM)',
    availableDays: currentTeacher?.availableDays || ['Mon', 'Tue', 'Wed', 'Thu'],
  });

  const [eduForm, setEduForm] = useState<TeacherEducation>({
    id: '',
    degree: '',
    specialization: '',
    institution: '',
    year: '',
    grade: '',
  });

  const [expForm, setExpForm] = useState<TeacherExperience>({
    id: '',
    organization: '',
    designation: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  const [saving, setSaving] = useState(false);

  // Dynamic Profile Completion Calculation
  const completionDetails = useMemo(() => {
    const fields = [
      { label: 'Profile Photo', done: !!currentTeacher?.avatar, key: 'photo' },
      { label: 'Full Name', done: !!currentTeacher?.name, key: 'name' },
      { label: 'Designation', done: !!currentTeacher?.designation, key: 'designation' },
      { label: 'Department', done: !!currentTeacher?.department, key: 'department' },
      { label: 'Phone Number', done: !!currentTeacher?.phone, key: 'phone' },
      { label: 'Office Hours & Location', done: !!(currentTeacher?.officeHours && currentTeacher?.officeLocation), key: 'office' },
      { label: 'Subjects Taught', done: !!(currentTeacher?.subjects && currentTeacher.subjects.length > 0), key: 'subjects' },
      { label: 'Areas of Expertise', done: !!(currentTeacher?.expertise && currentTeacher.expertise.length > 0), key: 'expertise' },
      { label: 'Education Records', done: !!(currentTeacher?.education && currentTeacher.education.length > 0), key: 'education' },
      { label: 'Work Experience', done: !!(currentTeacher?.experience && currentTeacher.experience.length > 0), key: 'experience' },
    ];
    const completedCount = fields.filter((f) => f.done).length;
    const percentage = Math.round((completedCount / fields.length) * 100);
    const missing = fields.filter((f) => !f.done);
    return { percentage, missing, fields };
  }, [currentTeacher]);

  const teacherAvatar = currentTeacher?.avatar || profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentTeacher?.name || 'Teacher')}`;

  // Save Handlers
  const handleSavePersonal = async () => {
    setSaving(true);
    const res = await updateTeacherProfile(teacherId, {
      name: personalForm.name,
      phone: personalForm.phone,
      dob: personalForm.dob,
      gender: personalForm.gender,
      address: personalForm.address,
      emergencyContact: personalForm.emergencyContact,
    });
    setSaving(false);
    if (res.ok) {
      setShowPersonalModal(false);
      setFeedback({ kind: 'success', message: '✓ Personal information updated successfully' });
    }
  };

  const handleSaveProfessional = async () => {
    setSaving(true);
    const res = await updateTeacherProfile(teacherId, {
      employeeId: professionalForm.employeeId,
      designation: professionalForm.designation,
      department: professionalForm.department,
      institution: professionalForm.institution,
      joiningDate: professionalForm.joiningDate,
      yearsOfExperience: professionalForm.yearsOfExperience,
    });
    setSaving(false);
    if (res.ok) {
      setShowProfessionalModal(false);
      setFeedback({ kind: 'success', message: '✓ Professional information updated successfully' });
    }
  };

  const handleAddSubject = async () => {
    if (!professionalForm.newSubject.trim()) return;
    const existingSubjects = currentTeacher?.subjects || [];
    const updated = Array.from(new Set([...existingSubjects, professionalForm.newSubject.trim()]));
    await updateTeacherProfile(teacherId, { subjects: updated });
    setProfessionalForm((prev) => ({ ...prev, newSubject: '' }));
  };

  const handleRemoveSubject = async (subject: string) => {
    const updated = (currentTeacher?.subjects || []).filter((s) => s !== subject);
    await updateTeacherProfile(teacherId, { subjects: updated });
  };

  const handleAddExpertise = async () => {
    if (!professionalForm.newExpertise.trim()) return;
    const existing = currentTeacher?.expertise || [];
    const updated = Array.from(new Set([...existing, professionalForm.newExpertise.trim()]));
    await updateTeacherProfile(teacherId, { expertise: updated });
    setProfessionalForm((prev) => ({ ...prev, newExpertise: '' }));
  };

  const handleRemoveExpertise = async (item: string) => {
    const updated = (currentTeacher?.expertise || []).filter((e) => e !== item);
    await updateTeacherProfile(teacherId, { expertise: updated });
  };

  const handleSaveContact = async () => {
    setSaving(true);
    const res = await updateTeacherProfile(teacherId, {
      officialEmail: contactForm.officialEmail,
      phone: contactForm.phone,
      officeLocation: contactForm.officeLocation,
      officeHours: contactForm.officeHours,
      availableDays: contactForm.availableDays,
    });
    setSaving(false);
    if (res.ok) {
      setShowContactModal(false);
      setFeedback({ kind: 'success', message: '✓ Contact & availability updated successfully' });
    }
  };

  const handleSaveEducation = async () => {
    if (!eduForm.degree || !eduForm.institution) return;
    setSaving(true);
    const existing = currentTeacher?.education || [];
    let updated: TeacherEducation[];
    if (eduForm.id) {
      updated = existing.map((item) => (item.id === eduForm.id ? eduForm : item));
    } else {
      updated = [...existing, { ...eduForm, id: `edu_${Date.now()}` }];
    }
    const res = await updateTeacherProfile(teacherId, { education: updated });
    setSaving(false);
    if (res.ok) {
      setShowEduModal(false);
      setEditingEdu(null);
      setFeedback({ kind: 'success', message: '✓ Education records updated' });
    }
  };

  const handleDeleteEducation = async (id: string) => {
    if (!window.confirm('Delete this education entry?')) return;
    const updated = (currentTeacher?.education || []).filter((item) => item.id !== id);
    await updateTeacherProfile(teacherId, { education: updated });
    setFeedback({ kind: 'success', message: '✓ Education record deleted' });
  };

  const handleSaveExperience = async () => {
    if (!expForm.organization || !expForm.designation) return;
    setSaving(true);
    const existing = currentTeacher?.experience || [];
    let updated: TeacherExperience[];
    if (expForm.id) {
      updated = existing.map((item) => (item.id === expForm.id ? expForm : item));
    } else {
      updated = [...existing, { ...expForm, id: `exp_${Date.now()}` }];
    }
    const res = await updateTeacherProfile(teacherId, { experience: updated });
    setSaving(false);
    if (res.ok) {
      setShowExpModal(false);
      setEditingExp(null);
      setFeedback({ kind: 'success', message: '✓ Experience record updated' });
    }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!window.confirm('Delete this experience entry?')) return;
    const updated = (currentTeacher?.experience || []).filter((item) => item.id !== id);
    await updateTeacherProfile(teacherId, { experience: updated });
    setFeedback({ kind: 'success', message: '✓ Experience record deleted' });
  };

  const handleSavePhoto = async (newUrl?: string) => {
    setSaving(true);
    const targetUrl = newUrl !== undefined ? newUrl : photoUrlInput;
    const res = await updateTeacherProfile(teacherId, { avatar: targetUrl });
    setSaving(false);
    if (res.ok) {
      setShowPhotoModal(false);
      setFeedback({ kind: 'success', message: '✓ Profile photo updated successfully' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      await handleSavePhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleVisibilityChange = async (vis: TeacherVisibility) => {
    const res = await updateTeacherProfile(teacherId, { visibility: vis });
    if (res.ok) {
      setFeedback({ kind: 'success', message: `✓ Profile visibility set to ${vis.replace('_', ' ')}` });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="My Profile & Account Settings"
        subtitle="Manage your personal information, professional credentials, availability, and profile visibility"
      />

      {/* Google-Style Hero Header Card */}
      <div className="rounded-2xl bg-white border border-ink-200 shadow-xs p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary-700 via-primary-600 to-accent-600"></div>

        <div className="relative pt-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            <div className="relative group">
              <img
                src={teacherAvatar}
                alt={currentTeacher?.name}
                className="w-28 h-28 rounded-2xl border-4 border-white shadow-md bg-ink-100 object-cover"
              />
              <button
                onClick={() => setShowPhotoModal(true)}
                className="absolute bottom-1 right-1 p-2 rounded-xl bg-ink-900 text-white shadow-md hover:bg-primary-600 transition-all cursor-pointer"
                title="Change profile photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 pb-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-black text-ink-900 font-display">{currentTeacher?.name}</h2>
                <Badge variant="success">● Active</Badge>
              </div>
              <p className="text-sm font-bold text-ink-700">{currentTeacher?.designation || 'Assistant Professor'} • {currentTeacher?.department || 'Computer Science'}</p>
              <p className="text-xs text-ink-500">{currentTeacher?.institution || 'Bright Future College'} • Emp ID: {currentTeacher?.employeeId || 'EMP-CS-104'}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowPhotoModal(true)}
              className="btn-secondary text-xs"
            >
              <Camera className="w-3.5 h-3.5" /> Update Photo
            </button>
            <button
              onClick={() => {
                setPersonalForm({
                  name: currentTeacher?.name || '',
                  email: currentTeacher?.email || '',
                  phone: currentTeacher?.phone || '',
                  dob: currentTeacher?.dob || '',
                  gender: currentTeacher?.gender || '',
                  address: currentTeacher?.address || '',
                  emergencyContact: currentTeacher?.emergencyContact || '',
                });
                setShowPersonalModal(true);
              }}
              className="btn-primary text-xs"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          </div>
        </div>

        {/* Profile Completion Meter */}
        <div className="mt-6 pt-5 border-t border-ink-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-ink-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary-600" /> PROFILE COMPLETION SCORE
              </span>
              <span className="text-primary-700 font-black">{completionDetails.percentage}%</span>
            </div>
            <div className="h-2.5 w-full bg-ink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-600 to-success-500 transition-all duration-500 rounded-full"
                style={{ width: `${completionDetails.percentage}%` }}
              ></div>
            </div>
            {completionDetails.missing.length > 0 && (
              <p className="text-xs text-ink-500">
                <strong>Complete your profile:</strong> Add {completionDetails.missing.map((m) => m.label).slice(0, 3).join(', ')}
              </p>
            )}
          </div>

          <div className="text-right">
            <Badge variant={completionDetails.percentage >= 90 ? 'success' : 'warning'}>
              {completionDetails.percentage >= 90 ? 'High Quality Profile' : 'Action Recommended'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-ink-200 overflow-x-auto pb-1">
        {[
          { id: 'personal', label: 'Personal Information', icon: User },
          { id: 'professional', label: 'Professional Info', icon: Briefcase },
          { id: 'education', label: 'Education & Experience', icon: GraduationCap },
          { id: 'availability', label: 'Contact & Availability', icon: Clock },
          { id: 'privacy', label: 'Privacy & Visibility', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer',
                isActive
                  ? 'bg-ink-900 text-white shadow-xs'
                  : 'bg-white text-ink-700 hover:bg-ink-100 border border-ink-200'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT SECTIONS */}

      {/* 1. PERSONAL INFORMATION */}
      {activeTab === 'personal' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" /> Personal Details
              </h3>
              <p className="text-xs text-ink-500">Your basic profile information and identity details</p>
            </div>
            <button
              onClick={() => {
                setPersonalForm({
                  name: currentTeacher?.name || '',
                  email: currentTeacher?.email || '',
                  phone: currentTeacher?.phone || '',
                  dob: currentTeacher?.dob || '',
                  gender: currentTeacher?.gender || '',
                  address: currentTeacher?.address || '',
                  emergencyContact: currentTeacher?.emergencyContact || '',
                });
                setShowPersonalModal(true);
              }}
              className="btn-secondary text-xs"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Personal Info
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Full Name</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.name}</strong>
            </div>

            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block flex items-center gap-1">
                Account Email <Lock className="w-3 h-3 text-ink-400" />
              </span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.email}</strong>
              <span className="text-[10px] text-ink-400">Authenticated ID</span>
            </div>

            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Phone Number</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.phone || 'Not specified'}</strong>
            </div>

            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Date of Birth</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.dob || '1990-03-15'}</strong>
            </div>

            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Gender</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.gender || 'Female'}</strong>
            </div>

            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Emergency Contact</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.emergencyContact || '+91 90000 55555'}</strong>
            </div>

            <div className="md:col-span-2 lg:col-span-3 p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Residential Address</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.address || 'Sector 14, New Delhi, India'}</strong>
            </div>
          </div>
        </Card>
      )}

      {/* 2. PROFESSIONAL INFORMATION */}
      {activeTab === 'professional' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary-600" /> Academic & Professional Record
              </h3>
              <p className="text-xs text-ink-500">Designation, department, experience, and academic expertise</p>
            </div>
            <button
              onClick={() => {
                setProfessionalForm({
                  employeeId: currentTeacher?.employeeId || '',
                  designation: currentTeacher?.designation || '',
                  department: currentTeacher?.department || '',
                  institution: currentTeacher?.institution || '',
                  joiningDate: currentTeacher?.joiningDate || '',
                  yearsOfExperience: currentTeacher?.yearsOfExperience || '',
                  newSubject: '',
                  newExpertise: '',
                });
                setShowProfessionalModal(true);
              }}
              className="btn-secondary text-xs"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Professional Info
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Employee ID</span>
              <strong className="text-sm font-bold text-ink-900 block font-mono">{currentTeacher?.employeeId || 'EMP-CS-104'}</strong>
            </div>

            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Designation</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.designation || 'Assistant Professor'}</strong>
            </div>

            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Department</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.department || 'Computer Science'}</strong>
            </div>

            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Institution</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.institution || 'Bright Future College'}</strong>
            </div>

            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Date of Joining</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.joiningDate || '2016-08-01'}</strong>
            </div>

            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 space-y-1">
              <span className="text-ink-400 font-medium block">Teaching Experience</span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.yearsOfExperience || '8+ Years'}</strong>
            </div>
          </div>

          {/* Subjects Taught Tags */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary-600" /> Subjects Taught
            </h4>
            <div className="flex flex-wrap gap-2">
              {(currentTeacher?.subjects || []).map((sub) => (
                <span key={sub} className="px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 border border-primary-100 font-bold text-xs flex items-center gap-1.5">
                  {sub}
                  <button onClick={() => handleRemoveSubject(sub)} className="hover:text-error-600"><X className="w-3.5 h-3.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                placeholder="Add subject (e.g. Compiler Design)"
                value={professionalForm.newSubject}
                onChange={(e) => setProfessionalForm({ ...professionalForm, newSubject: e.target.value })}
                className="input text-xs py-1.5"
              />
              <button onClick={handleAddSubject} className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Areas of Expertise Tags */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-accent-600" /> Areas of Expertise
            </h4>
            <div className="flex flex-wrap gap-2">
              {(currentTeacher?.expertise || []).map((exp) => (
                <span key={exp} className="px-3 py-1.5 rounded-xl bg-accent-50 text-accent-800 border border-accent-100 font-bold text-xs flex items-center gap-1.5">
                  {exp}
                  <button onClick={() => handleRemoveExpertise(exp)} className="hover:text-error-600"><X className="w-3.5 h-3.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                placeholder="Add expertise (e.g. Natural Language Processing)"
                value={professionalForm.newExpertise}
                onChange={(e) => setProfessionalForm({ ...professionalForm, newExpertise: e.target.value })}
                className="input text-xs py-1.5"
              />
              <button onClick={handleAddExpertise} className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* 3. EDUCATION & EXPERIENCE */}
      {activeTab === 'education' && (
        <div className="space-y-6">
          {/* Education Records */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary-600" /> Educational Qualifications
                </h3>
                <p className="text-xs text-ink-500">Degrees, specializations, and academic honors</p>
              </div>
              <button
                onClick={() => {
                  setEduForm({ id: '', degree: '', specialization: '', institution: '', year: '', grade: '' });
                  setShowEduModal(true);
                }}
                className="btn-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Education
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(currentTeacher?.education || []).map((edu) => (
                <div key={edu.id} className="p-4 rounded-xl bg-ink-50 border border-ink-200 flex flex-col justify-between space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-ink-900">{edu.degree} in {edu.specialization}</h4>
                      <p className="text-xs text-ink-600 font-medium">{edu.institution}</p>
                    </div>
                    <Badge variant="primary">{edu.year}</Badge>
                  </div>

                  {edu.grade && <p className="text-xs text-ink-500"><strong>Grade / Score:</strong> {edu.grade}</p>}

                  <div className="pt-2 border-t border-ink-100 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEduForm(edu);
                        setShowEduModal(true);
                      }}
                      className="btn-ghost text-xs py-1 px-2"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEducation(edu.id)}
                      className="btn-ghost text-xs py-1 px-2 text-error-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {(currentTeacher?.education || []).length === 0 && (
                <p className="p-8 text-center text-xs text-ink-500 col-span-2">No education records added yet.</p>
              )}
            </div>
          </Card>

          {/* Work Experience */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-accent-600" /> Work & Teaching Experience
                </h3>
                <p className="text-xs text-ink-500">Previous and current institutional appointments</p>
              </div>
              <button
                onClick={() => {
                  setExpForm({ id: '', organization: '', designation: '', startDate: '', endDate: '', description: '' });
                  setShowExpModal(true);
                }}
                className="btn-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </button>
            </div>

            <div className="space-y-4">
              {(currentTeacher?.experience || []).map((exp) => (
                <div key={exp.id} className="p-4 rounded-xl bg-ink-50 border border-ink-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-ink-900">{exp.designation}</h4>
                      <Badge variant="accent">{exp.startDate} – {exp.endDate}</Badge>
                    </div>
                    <p className="text-xs font-semibold text-primary-700">{exp.organization}</p>
                    {exp.description && <p className="text-xs text-ink-600">{exp.description}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setExpForm(exp);
                        setShowExpModal(true);
                      }}
                      className="btn-ghost text-xs py-1.5 px-3"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="btn-ghost text-xs py-1.5 px-3 text-error-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {(currentTeacher?.experience || []).length === 0 && (
                <p className="p-8 text-center text-xs text-ink-500">No work experience records added yet.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 4. CONTACT & AVAILABILITY */}
      {activeTab === 'availability' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-600" /> Office Hours & Availability
              </h3>
              <p className="text-xs text-ink-500">Visible contact channels and faculty consultation hours</p>
            </div>
            <button
              onClick={() => {
                setContactForm({
                  officialEmail: currentTeacher?.officialEmail || currentTeacher?.email || '',
                  phone: currentTeacher?.phone || '',
                  officeLocation: currentTeacher?.officeLocation || '',
                  officeHours: currentTeacher?.officeHours || '',
                  availableDays: currentTeacher?.availableDays || [],
                });
                setShowContactModal(true);
              }}
              className="btn-secondary text-xs"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Contact & Hours
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div className="p-4 bg-ink-50 rounded-xl border border-ink-200 space-y-1">
              <span className="text-ink-400 font-medium block flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary-600" /> Official Email
              </span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.officialEmail || currentTeacher?.email}</strong>
            </div>

            <div className="p-4 bg-ink-50 rounded-xl border border-ink-200 space-y-1">
              <span className="text-ink-400 font-medium block flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-success-600" /> Contact Phone
              </span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.phone || 'Not specified'}</strong>
            </div>

            <div className="p-4 bg-ink-50 rounded-xl border border-ink-200 space-y-1">
              <span className="text-ink-400 font-medium block flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-error-600" /> Office Location
              </span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.officeLocation || 'Block B, Room 304'}</strong>
            </div>

            <div className="md:col-span-2 p-4 bg-ink-50 rounded-xl border border-ink-200 space-y-1">
              <span className="text-ink-400 font-medium block flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-warning-600" /> Office Consultation Hours
              </span>
              <strong className="text-sm font-bold text-ink-900 block">{currentTeacher?.officeHours || 'Mon–Thu (2:00 PM – 4:00 PM)'}</strong>
            </div>

            <div className="p-4 bg-ink-50 rounded-xl border border-ink-200 space-y-1">
              <span className="text-ink-400 font-medium block">Available Consultation Days</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(currentTeacher?.availableDays || ['Mon', 'Tue', 'Wed', 'Thu']).map((day) => (
                  <Badge key={day} variant="primary" size="sm">{day}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 5. PRIVACY & VISIBILITY */}
      {activeTab === 'privacy' && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-ink-100 pb-4">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-600" /> Profile Visibility & Privacy Settings
            </h3>
            <p className="text-xs text-ink-500">Control who can view your profile, contact phone, and consultation schedule</p>
          </div>

          <div className="space-y-4 max-w-2xl">
            {[
              {
                id: 'all',
                title: 'Students & Admin (Public)',
                desc: 'Your full profile, subjects, office hours, and contact information are visible to all enrolled students and administrators.',
              },
              {
                id: 'batch_only',
                title: 'Students in My Batches + Admin (Restricted)',
                desc: 'Personal phone number and office location are restricted to students in your assigned batches and administrators.',
              },
              {
                id: 'admin_only',
                title: 'Admin Only (Private)',
                desc: 'Only administrators can view your direct personal phone and contact details. Students see course information only.',
              },
            ].map((option) => {
              const isSelected = (currentTeacher?.visibility || 'all') === option.id;
              return (
                <label
                  key={option.id}
                  onClick={() => handleVisibilityChange(option.id as TeacherVisibility)}
                  className={cn(
                    'p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer',
                    isSelected
                      ? 'bg-primary-50/50 border-primary-300 ring-2 ring-primary-500/20'
                      : 'bg-white border-ink-200 hover:border-ink-300'
                  )}
                >
                  <input
                    type="radio"
                    name="profile_visibility"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-1 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-ink-900">{option.title}</h4>
                    <p className="text-xs text-ink-600 mt-0.5">{option.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </Card>
      )}

      {/* EDIT MODALS */}

      {/* Update Photo Modal */}
      <Modal open={showPhotoModal} onClose={() => setShowPhotoModal(false)} title="Update Profile Photo" size="md">
        <div className="space-y-5 text-xs text-ink-800">
          <div className="text-center space-y-3">
            <img src={photoUrlInput || teacherAvatar} alt="Preview" className="w-24 h-24 rounded-2xl bg-ink-100 mx-auto object-cover border-2 border-primary-500" />
            <p className="text-xs text-ink-500">Upload a professional avatar or enter an image URL.</p>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Upload Local Image File</label>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="input text-xs" />
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-ink-200"></div>
            <span className="flex-shrink mx-2 text-ink-400 text-[10px] uppercase font-bold">OR</span>
            <div className="flex-grow border-t border-ink-200"></div>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Image URL</label>
            <input
              type="text"
              placeholder="https://example.com/avatar.jpg"
              value={photoUrlInput}
              onChange={(e) => setPhotoUrlInput(e.target.value)}
              className="input text-xs"
            />
          </div>

          <div className="pt-2 flex justify-between gap-2 border-t border-ink-100">
            <button
              onClick={() => handleSavePhoto('')}
              className="btn-ghost text-xs text-error-600"
            >
              Remove Photo
            </button>
            <div className="flex gap-2">
              <button onClick={() => setShowPhotoModal(false)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={() => handleSavePhoto()} disabled={saving} className="btn-primary text-xs">
                {saving ? 'Saving...' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Personal Info Modal */}
      <Modal open={showPersonalModal} onClose={() => setShowPersonalModal(false)} title="Edit Personal Information" size="md">
        <div className="space-y-4 text-xs text-ink-800">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Full Name</label>
            <input
              type="text"
              value={personalForm.name}
              onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
              className="input text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1 flex items-center gap-1">
              Account Email <Lock className="w-3 h-3 text-ink-400" />
            </label>
            <input
              type="email"
              value={personalForm.email}
              disabled
              className="input text-xs bg-ink-100 text-ink-500 cursor-not-allowed"
            />
            <span className="text-[10px] text-ink-400">Email is your login identifier and cannot be changed here.</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={personalForm.phone}
                onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Emergency Contact</label>
              <input
                type="text"
                value={personalForm.emergencyContact}
                onChange={(e) => setPersonalForm({ ...personalForm, emergencyContact: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={personalForm.dob}
                onChange={(e) => setPersonalForm({ ...personalForm, dob: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Gender</label>
              <select
                value={personalForm.gender}
                onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
                className="input text-xs"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Residential Address</label>
            <input
              type="text"
              value={personalForm.address}
              onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
              className="input text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-ink-100">
            <button onClick={() => setShowPersonalModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleSavePersonal} disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Professional Info Modal */}
      <Modal open={showProfessionalModal} onClose={() => setShowProfessionalModal(false)} title="Edit Professional Details" size="md">
        <div className="space-y-4 text-xs text-ink-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Employee ID</label>
              <input
                type="text"
                value={professionalForm.employeeId}
                onChange={(e) => setProfessionalForm({ ...professionalForm, employeeId: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Designation</label>
              <input
                type="text"
                value={professionalForm.designation}
                onChange={(e) => setProfessionalForm({ ...professionalForm, designation: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Department</label>
              <input
                type="text"
                value={professionalForm.department}
                onChange={(e) => setProfessionalForm({ ...professionalForm, department: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Institution</label>
              <input
                type="text"
                value={professionalForm.institution}
                onChange={(e) => setProfessionalForm({ ...professionalForm, institution: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Date of Joining</label>
              <input
                type="date"
                value={professionalForm.joiningDate}
                onChange={(e) => setProfessionalForm({ ...professionalForm, joiningDate: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Teaching Experience</label>
              <input
                type="text"
                placeholder="e.g. 8+ Years"
                value={professionalForm.yearsOfExperience}
                onChange={(e) => setProfessionalForm({ ...professionalForm, yearsOfExperience: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-ink-100">
            <button onClick={() => setShowProfessionalModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleSaveProfessional} disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Education Modal */}
      <Modal open={showEduModal} onClose={() => setShowEduModal(false)} title={eduForm.id ? 'Edit Education' : 'Add Education'} size="md">
        <div className="space-y-4 text-xs text-ink-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Degree</label>
              <input
                type="text"
                placeholder="e.g. M.Tech"
                value={eduForm.degree}
                onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Specialization</label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={eduForm.specialization}
                onChange={(e) => setEduForm({ ...eduForm, specialization: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Institution / University</label>
            <input
              type="text"
              placeholder="e.g. IIT Delhi"
              value={eduForm.institution}
              onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })}
              className="input text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Passing Year</label>
              <input
                type="text"
                placeholder="e.g. 2015"
                value={eduForm.year}
                onChange={(e) => setEduForm({ ...eduForm, year: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">Grade / CGPA</label>
              <input
                type="text"
                placeholder="e.g. CGPA: 9.2"
                value={eduForm.grade}
                onChange={(e) => setEduForm({ ...eduForm, grade: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-ink-100">
            <button onClick={() => setShowEduModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleSaveEducation} disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Experience Modal */}
      <Modal open={showExpModal} onClose={() => setShowExpModal(false)} title={expForm.id ? 'Edit Experience' : 'Add Experience'} size="md">
        <div className="space-y-4 text-xs text-ink-800">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Organization / Institution</label>
            <input
              type="text"
              placeholder="e.g. Bright Future College"
              value={expForm.organization}
              onChange={(e) => setExpForm({ ...expForm, organization: e.target.value })}
              className="input text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Designation</label>
            <input
              type="text"
              placeholder="e.g. Assistant Professor"
              value={expForm.designation}
              onChange={(e) => setExpForm({ ...expForm, designation: e.target.value })}
              className="input text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-700 mb-1">Start Date</label>
              <input
                type="text"
                placeholder="e.g. 2016-08"
                value={expForm.startDate}
                onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-700 mb-1">End Date</label>
              <input
                type="text"
                placeholder="e.g. Present"
                value={expForm.endDate}
                onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })}
                className="input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Description / Key Responsibilities</label>
            <textarea
              rows={3}
              placeholder="Key teaching and research accomplishments..."
              value={expForm.description}
              onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
              className="input text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-ink-100">
            <button onClick={() => setShowExpModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleSaveExperience} disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Contact & Hours Modal */}
      <Modal open={showContactModal} onClose={() => setShowContactModal(false)} title="Edit Contact & Office Hours" size="md">
        <div className="space-y-4 text-xs text-ink-800">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Official Faculty Email</label>
            <input
              type="email"
              value={contactForm.officialEmail}
              onChange={(e) => setContactForm({ ...contactForm, officialEmail: e.target.value })}
              className="input text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Office Location</label>
            <input
              type="text"
              placeholder="e.g. Block B, Room 304"
              value={contactForm.officeLocation}
              onChange={(e) => setContactForm({ ...contactForm, officeLocation: e.target.value })}
              className="input text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink-700 mb-1">Office Consultation Hours</label>
            <input
              type="text"
              placeholder="e.g. Mon–Thu (2:00 PM – 4:00 PM)"
              value={contactForm.officeHours}
              onChange={(e) => setContactForm({ ...contactForm, officeHours: e.target.value })}
              className="input text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-ink-100">
            <button onClick={() => setShowContactModal(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleSaveContact} disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
