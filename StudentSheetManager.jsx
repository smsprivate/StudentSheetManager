import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { Search, Plus, Trash2, Edit, X, Loader2, Users, User, Phone, Mail, GraduationCap, Calendar, Zap, HardHat, AlertTriangle } from 'lucide-react';

// --- Global Variable Setup (Required for environment authentication) ---
// The system will automatically log you in using the provided token.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// !!! IMPORTANT: UPDATE THIS URL !!!
// 1. **MOCK DATA MODE:** If this URL is the placeholder, the app runs using internal, temporary mock data.
// 2. **PRODUCTION MODE:** Replace this with your deployed Google Apps Script URL to connect to your sheet.
const GOOGLE_SHEET_API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE'; 
const USE_MOCK_DATA = GOOGLE_SHEET_API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

// --- Constants & Mock Data ---
const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][i];
  return { value: roman, label: `Class ${roman}` };
});
const SECTION_OPTIONS = [
  { value: 'MAHA', label: 'MAHA' },
  { value: 'RISHI', label: 'RISHI' },
  { value: 'NONE', label: 'NONE' },
];

const MOCK_STUDENTS = [
    { id: '1', studentId: 'S001', studentName: 'Ravi Sharma', className: 'V', section: 'MAHA', rollNo: '101', dateOfBirth: '2015-05-15', fatherName: 'Ajay Sharma', phoneNumber: '9876543210', emailId: 'ravi@example.com', photoUrl: 'https://placehold.co/100x100/1e40af/ffffff?text=Ravi', signatureUrl: 'https://placehold.co/150x50/3b82f6/ffffff?text=Signature', },
    { id: '2', studentId: 'S002', studentName: 'Priya Singh', className: 'IX', section: 'RISHI', rollNo: '205', dateOfBirth: '2011-11-22', fatherName: 'Manoj Singh', phoneNumber: '9988776655', emailId: 'priya@example.com', photoUrl: 'https://placehold.co/100x100/dc2626/ffffff?text=Priya', signatureUrl: 'https://placehold.co/150x50/ef4444/ffffff?text=Signature', },
    { id: '3', studentId: 'S003', studentName: 'Aarav Patel', className: 'II', section: 'MAHA', rollNo: '056', dateOfBirth: '2018-08-01', fatherName: 'Vijay Patel', phoneNumber: '9001122334', emailId: 'aarav@example.com', photoUrl: 'https://placehold.co/100x100/059669/ffffff?text=Aarav', signatureUrl: 'https://placehold.co/150x50/10b981/ffffff?text=Signature', },
    { id: '4', studentId: 'S004', studentName: 'Deepak Kumar', className: 'XII', section: 'NONE', rollNo: '301', dateOfBirth: '2008-01-01', fatherName: 'Ram Kumar', phoneNumber: '9123456789', emailId: 'deepak@example.com', photoUrl: 'https://placehold.co/100x100/f59e0b/ffffff?text=Deepak', signatureUrl: 'https://placehold.co/150x50/fbbf24/ffffff?text=Signature', },
];


// --- Utility Components for Aesthetics ---

const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', type = 'button' }) => {
  const baseStyle = 'px-4 py-2 rounded-xl text-sm font-semibold transition duration-300 ease-in-out flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5';
  let variantStyle = '';

  switch (variant) {
    case 'primary':
      variantStyle = 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/50';
      break;
    case 'secondary':
      variantStyle = 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-4 focus:ring-gray-400/50';
      break;
    case 'danger':
      variantStyle = 'bg-red-600 text-white hover:bg-red-700 focus:ring-4 focus:ring-red-500/50';
      break;
    case 'success':
      variantStyle = 'bg-green-600 text-white hover:bg-green-700 focus:ring-4 focus:ring-green-500/50';
      break;
    default:
      variantStyle = 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/50';
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyle} ${disabled ? 'opacity-60 cursor-not-allowed shadow-none transform-none' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

// Image Display Component with Fallback
const ImageDisplay = ({ url, type, className = "w-10 h-10 object-cover rounded-lg", style = {} }) => {
  const [error, setError] = useState(false);

  // Simple conversion for common Google Drive share link to direct link
  const getImageUrl = (originalUrl) => {
    if (originalUrl && originalUrl.includes('drive.google.com')) {
      const match = originalUrl.match(/id=([a-zA-Z0-9_-]+)/) || originalUrl.match(/\/d\/([a-zA-Z0-9_-]+)\//);
      const fileId = match ? match[1] : null;
      // Using a direct download link often bypasses sharing restrictions for public files
      return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : originalUrl;
    }
    return originalUrl;
  };

  const finalUrl = useMemo(() => getImageUrl(url), [url]);

  useEffect(() => {
    setError(false);
  }, [finalUrl]);

  const handleError = () => setError(true);

  if (!url || error) {
    return (
      <div className={`${className} bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500`}>
        {type === 'photo' ? <User size={18} /> : <Zap size={18} />}
      </div>
    );
  }

  return (
    <img
      src={finalUrl}
      alt={`${type} of student`}
      className={className}
      style={style}
      loading="lazy"
      onError={handleError}
    />
  );
};

// Input Field Component
const InputField = ({ label, id, type = 'text', value, onChange, placeholder, required = false, icon: Icon, className = '' }) => (
  <div className="flex flex-col space-y-1">
    <label htmlFor={id} className="text-sm font-medium text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon size={18} className="text-indigo-400" />
        </div>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full p-2 ${Icon ? 'pl-10' : 'pl-3'} border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150 ease-in-out shadow-inner ${className}`}
      />
    </div>
  </div>
);

// --- Student Form (Add/Edit Modal) ---
const StudentForm = ({ student, onSave, onCancel, isSaving }) => {
  const [formData, setFormData] = useState(student || {});
  const isEditMode = !!student.id;

  useEffect(() => {
    setFormData({ 
      ...student,
      rollNo: String(student.rollNo || ''),
      phoneNumber: String(student.phoneNumber || ''),
      className: student.className || 'I',
      section: student.section || 'MAHA',
    } || {});
  }, [student]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.studentId || !formData.studentName) {
      // Using a custom message box instead of alert()
      console.error("Validation Error: Student ID and Name are mandatory.");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto p-6 transition-all duration-300 transform scale-100 opacity-100 border-t-8 border-indigo-600 ring-4 ring-indigo-500/10">
        <div className="flex justify-between items-start mb-6 border-b pb-3">
          <h2 className="text-3xl font-extrabold text-indigo-700">{isEditMode ? 'Edit Student Record' : 'Add New Student'}</h2>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition duration-150 shadow-md">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField label="Student ID" id="studentId" value={formData.studentId || ''} onChange={handleChange} placeholder="Unique Student ID" required icon={GraduationCap} disabled={isEditMode} className={isEditMode ? 'bg-gray-50' : ''} />
          <InputField label="Student Name" id="studentName" value={formData.studentName || ''} onChange={handleChange} placeholder="Full Name" required icon={User} />

          <InputField label="Roll No" id="rollNo" value={formData.rollNo || ''} onChange={handleChange} placeholder="Roll Number" icon={Zap} />
          <InputField label="Date of Birth" id="dateOfBirth" type="date" value={formData.dateOfBirth || ''} onChange={handleChange} icon={Calendar} />

          <div className="flex flex-col space-y-1">
            <label htmlFor="className" className="text-sm font-medium text-gray-700">Class</label>
            <select id="className" value={formData.className || 'I'} onChange={handleChange} className="p-2.5 pl-3 border-2 border-gray-300 bg-white rounded-xl shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150">
              {CLASS_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
            </select>
          </div>

          <div className="flex flex-col space-y-1">
            <label htmlFor="section" className="text-sm font-medium text-gray-700">Section</label>
            <select id="section" value={formData.section || 'MAHA'} onChange={handleChange} className="p-2.5 pl-3 border-2 border-gray-300 bg-white rounded-xl shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150">
              {SECTION_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
            </select>
          </div>

          <InputField label="Father's Name" id="fatherName" value={formData.fatherName || ''} onChange={handleChange} placeholder="Father's Name" icon={HardHat} />
          <InputField label="Phone Number" id="phoneNumber" type="tel" value={formData.phoneNumber || ''} onChange={handleChange} placeholder="e.g., 919876543210" icon={Phone} />
          
          <InputField label="Email ID" id="emailId" type="email" value={formData.emailId || ''} onChange={handleChange} placeholder="student@example.com" icon={Mail} className="md:col-span-2" />

          <InputField label="Photo URL (Google Drive/Public)" id="photoUrl" value={formData.photoUrl || ''} onChange={handleChange} placeholder="Must be a direct/public URL" className="md:col-span-2" />
          <InputField label="Signature URL (Google Drive/Public)" id="signatureUrl" value={formData.signatureUrl || ''} onChange={handleChange} placeholder="Must be a direct/public URL" className="md:col-span-2" />

          <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t mt-4 border-gray-200">
            <Button onClick={onCancel} variant="secondary" disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={20} className="animate-spin mr-2" /> : <Edit size={20} className="mr-1" />}
              {isEditMode ? 'Update Record' : 'Add Record'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- Main Application Component ---
const App = () => {
  // Authentication State
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Application State
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');

  // --- Firebase Initialization (Auth Only) ---
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      setAuth(authInstance);

      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        if (!user) {
          if (initialAuthToken) {
            await signInWithCustomToken(authInstance, initialAuthToken);
          } else {
            await signInAnonymously(authInstance);
          }
        }
        setUserId(user?.uid || 'anonymous');
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Init Error:", e);
      setError("Failed to initialize system authentication.");
      setIsAuthReady(true);
    }
  }, []);

  // --- MOCK Data Management Functions ---
  const mockFetchStudents = useCallback(() => {
      return new Promise(resolve => {
        setTimeout(() => { // Simulate network delay
          const data = JSON.parse(localStorage.getItem('mockStudents')) || MOCK_STUDENTS;
          localStorage.setItem('mockStudents', JSON.stringify(data));
          resolve(data);
        }, 500);
      });
  }, []);

  const mockSaveStudent = useCallback((student) => {
      return new Promise(resolve => {
          setTimeout(() => {
              let currentStudents = JSON.parse(localStorage.getItem('mockStudents')) || MOCK_STUDENTS;
              let updatedStudents;

              if (student.id) {
                  // Update existing
                  updatedStudents = currentStudents.map(s => s.id === student.id ? student : s);
              } else {
                  // Add new
                  const newId = `S${String(currentStudents.length + 1).padStart(3, '0')}-${Date.now()}`;
                  updatedStudents = [...currentStudents, { ...student, id: newId }];
              }
              localStorage.setItem('mockStudents', JSON.stringify(updatedStudents));
              resolve(updatedStudents);
          }, 500);
      });
  }, []);

  const mockDeleteStudent = useCallback((studentId) => {
      return new Promise(resolve => {
          setTimeout(() => {
              let currentStudents = JSON.parse(localStorage.getItem('mockStudents')) || MOCK_STUDENTS;
              const updatedStudents = currentStudents.filter(s => s.id !== studentId);
              localStorage.setItem('mockStudents', JSON.stringify(updatedStudents));
              resolve(updatedStudents);
          }, 500);
      });
  }, []);

  // --- REAL API CALLS (Used if USE_MOCK_DATA is false) ---

  const realFetchStudents = useCallback(async (retryCount = 0) => {
      const MAX_RETRIES = 3;
      try {
        const response = await fetch(GOOGLE_SHEET_API_URL, {
          method: 'GET',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data;
      } catch (e) {
        console.error("Fetch Error:", e);
        if (retryCount < MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(res => setTimeout(res, delay));
          return realFetchStudents(retryCount + 1);
        }
        throw new Error("Failed to load student data from API.");
      }
  }, []);
    
  // Note: Real Save/Delete requires doPost/doPut/doDelete in GAS
  const realApiAction = useCallback(async (action, data) => {
      try {
          const response = await fetch(GOOGLE_SHEET_API_URL, {
              method: 'POST', // Typically POST is used for all actions in GAS
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action, data }), // GAS will read {action: 'add', data: {student: {...}}}
          });
          if (!response.ok) throw new Error("API action failed.");
      } catch (e) {
          console.error("API Action Error:", e);
          throw new Error(`Failed to perform ${action}: ${e.message}`);
      }
  }, []);


  // --- Combined Fetch Logic ---
  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (USE_MOCK_DATA) {
        data = await mockFetchStudents();
      } else {
        data = await realFetchStudents();
      }
      // Ensure all students have a unique ID for React keys
      const processedData = data.map((s, index) => ({ 
        ...s, 
        id: s.id || s.studentId || `temp-${index}`,
        // Ensure data integrity/types for display
        rollNo: String(s.rollNo || ''),
        phoneNumber: String(s.phoneNumber || ''),
      }));
      setStudents(processedData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [mockFetchStudents, realFetchStudents]);

  // --- Initial Load and Polling ---
  useEffect(() => {
    if (isAuthReady) {
      loadStudents();
    }
    // Set a polling interval for updates (every 20 seconds)
    const intervalId = setInterval(loadStudents, 20000);
    return () => clearInterval(intervalId);
  }, [isAuthReady, loadStudents]);


  // --- CRUD Operations ---

  const handleSaveStudent = async (studentData) => {
    setIsSaving(true);
    setError(null);

    try {
      if (USE_MOCK_DATA) {
        const updatedList = await mockSaveStudent(studentData);
        setStudents(updatedList);
      } else {
        await realApiAction(studentData.id ? 'update' : 'add', studentData);
        await loadStudents(); // Re-fetch all data to verify the save
      }
      setIsFormOpen(false);
      setCurrentStudent(null);
    } catch (e) {
      setError(`Failed to save record: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student record?")) {
      return;
    }

    try {
      if (USE_MOCK_DATA) {
        const updatedList = await mockDeleteStudent(studentId);
        setStudents(updatedList);
      } else {
        await realApiAction('delete', { id: studentId });
        await loadStudents(); // Re-fetch all data to verify the deletion
      }
    } catch (e) {
      setError(`Failed to delete record: ${e.message}`);
    }
  };


  // --- Filtered Student List ---
  const filteredStudents = useMemo(() => {
    let filtered = students;
    const lowerCaseSearch = searchTerm.toLowerCase();

    // Apply Filters
    if (filterClass !== 'ALL') {
      filtered = filtered.filter(s => s.className === filterClass);
    }
    if (filterSection !== 'ALL') {
      filtered = filtered.filter(s => s.section === filterSection);
    }

    // Apply Search
    if (lowerCaseSearch) {
      filtered = filtered.filter(s =>
        (s.studentId && s.studentId.toLowerCase().includes(lowerCaseSearch)) ||
        (s.studentName && s.studentName.toLowerCase().includes(lowerCaseSearch)) ||
        (s.rollNo && String(s.rollNo).toLowerCase().includes(lowerCaseSearch)) ||
        (s.phoneNumber && s.phoneNumber.toLowerCase().includes(lowerCaseSearch)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(lowerCaseSearch))
      );
    }

    // Sort by Roll No (using simple string comparison)
    return filtered.sort((a, b) => {
      // Prioritize numeric sort for roll numbers if possible
      const rollA = parseInt(a.rollNo, 10);
      const rollB = parseInt(b.rollNo, 10);
      if (!isNaN(rollA) && !isNaN(rollB)) {
        return rollA - rollB;
      }
      return (a.rollNo || '').localeCompare(b.rollNo || '');
    });

  }, [students, searchTerm, filterClass, filterSection]);


  // --- Render Handlers ---

  const openAddForm = () => {
    setCurrentStudent({ id: null, studentId: '', studentName: '', className: 'I', section: 'MAHA', rollNo: '', dateOfBirth: '', fatherName: '', phoneNumber: '', emailId: '', photoUrl: '', signatureUrl: '' });
    setIsFormOpen(true);
  };

  const openEditForm = (student) => {
    setCurrentStudent(student);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setCurrentStudent(null);
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 size={40} className="animate-spin text-indigo-400 mr-4" />
        <p className="text-xl font-medium text-gray-200">Starting secure environment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-inter">
      <header className="bg-white shadow-xl rounded-3xl p-6 mb-8 border-t-4 border-indigo-600">
        <div className="flex flex-col sm:flex-row justify-between items-start">
          <h1 className="text-4xl font-extrabold text-gray-900 flex items-center mb-4 sm:mb-0">
            <Users size={40} className="mr-3 text-indigo-600" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Student Records Dashboard
            </span>
          </h1>
          <div className="text-sm text-gray-500 flex items-center">
            <User size={16} className="mr-1" />
            Admin User ID: <span className="font-mono ml-1 px-3 py-1 bg-indigo-100/50 text-indigo-800 rounded-lg text-xs shadow-inner">{userId}</span>
          </div>
        </div>
      </header>

      {/* Mock Data Warning / Real API Error */}
      {(USE_MOCK_DATA || error) && (
        <div className={`px-6 py-4 rounded-xl relative mb-6 font-semibold shadow-md ${USE_MOCK_DATA ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-800' : 'bg-red-100 border-2 border-red-400 text-red-800'}`} role="alert">
          <p className="flex items-center">
            <AlertTriangle size={20} className="mr-2" />
            {USE_MOCK_DATA 
              ? `MOCK DATA MODE: Data is only stored in your browser session. Replace the 'GOOGLE_SHEET_API_URL' constant to connect to your real Google Sheet.`
              : `API ERROR: ${error}`
            }
          </p>
        </div>
      )}

      {/* Control Panel and Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Bar */}
          <div className="md:col-span-2">
            <InputField 
              label="Quick Search" 
              id="search" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Search ID, Name, Roll No, or Phone No..." 
              icon={Search}
              className="pl-10"
            />
          </div>

          {/* Class Filter */}
          <div>
            <label htmlFor="filterClass" className="block text-sm font-medium text-gray-700">Filter by Class</label>
            <select
              id="filterClass"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="mt-1 block w-full py-2.5 px-3 border-2 border-gray-300 bg-white rounded-xl shadow-inner focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            >
              <option value="ALL">-- All Classes --</option>
              {CLASS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label htmlFor="filterSection" className="block text-sm font-medium text-gray-700">Filter by Section</label>
            <select
              id="filterSection"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="mt-1 block w-full py-2.5 px-3 border-2 border-gray-300 bg-white rounded-xl shadow-inner focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            >
              <option value="ALL">-- All Sections --</option>
              {SECTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>
        
        <div className="flex justify-end mt-5">
            <Button
                onClick={openAddForm}
                variant="success"
                className="w-full sm:w-auto"
            >
                <Plus size={20} className="mr-2" />
                Add New Student Record
            </Button>
        </div>
      </div>

      {/* Student Data Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-x-auto border border-gray-100">
        {loading && filteredStudents.length === 0 ? (
          <div className="flex items-center justify-center p-16 text-indigo-600">
            <Loader2 size={36} className="animate-spin mr-4" />
            <p className="text-xl font-medium">Loading student data...</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-indigo-50/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Photo</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID / Name</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Class / Sec</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Roll No</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Contact / DoB</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">Father</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Signature</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-lg text-gray-500 bg-gray-50">
                    No student records found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-indigo-50/50 transition duration-150">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ImageDisplay url={student.photoUrl} type="photo" className="w-12 h-12 object-cover rounded-xl shadow-md" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-indigo-700">{student.studentId}</div>
                        <div className="text-xs text-gray-600">{student.studentName}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      <div className="font-semibold text-lg">{student.className}</div>
                      <div className="text-xs text-gray-500 italic">Section: {student.section}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-lg font-extrabold text-green-700">{student.rollNo}</td>
                    
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 hidden sm:table-cell">
                        <div className="flex items-center text-xs text-gray-700"><Phone size={14} className="mr-1 text-indigo-500" />{student.phoneNumber}</div>
                        <div className="flex items-center text-xs text-gray-500 mt-1"><Calendar size={14} className="mr-1 text-indigo-500" />{student.dateOfBirth || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell">{student.fatherName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ImageDisplay url={student.signatureUrl} type="signature" className="w-24 h-10 object-contain rounded-md" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={() => openEditForm(student)}
                          variant="secondary"
                          title="Edit"
                          className="p-2"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          onClick={() => handleDeleteStudent(student.id)}
                          variant="danger"
                          title="Delete"
                          className="p-2"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {isFormOpen && (
        <StudentForm
          student={currentStudent}
          onSave={handleSaveStudent}
          onCancel={closeForm}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default App;

