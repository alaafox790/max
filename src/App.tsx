import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from './lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  ChevronRight, 
  RotateCcw, 
  CheckCircle2, 
  Loader2, 
  Info, 
  BrainCircuit, 
  Bot, 
  Rocket,
  AlertCircle,
  Menu,
  X,
  Phone,
  Lock,
  Download,
  Printer,
  Users,
  BarChart
} from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type Screen = 'intro' | 'welcome' | 'form' | 'success' | 'admin';

interface FormData {
  first_name: string;
  father_name: string;
  school_stage: string;
  school_name: string;
  reason_for_choosing: string;
  ai_knowledge: string;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('intro');
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminDialogError, setAdminDialogError] = useState("");

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  const [trainees, setTrainees] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    father_name: '',
    school_stage: '',
    school_name: '',
    reason_for_choosing: '',
    ai_knowledge: '',
  });

  const tracks = [
    { id: 'automation', name: 'مسار الأتمتة (Automation)', icon: <RotateCcw className="w-8 h-8 text-sky-400" />, desc: 'تعلم كيف تجعل الآلات تعمل نيابة عنك' },
    { id: 'agent', name: 'بناء وكيل ذكي (AI Agent)', icon: <Bot className="w-8 h-8 text-purple-400" />, desc: 'صمم وكلاء أذكياء يتفاعلون بشكل مستقل' },
    { id: 'apps', name: 'بناء تطبيقات متنوعة', icon: <Rocket className="w-8 h-8 text-emerald-400" />, desc: 'حول أفكارك إلى تطبيقات واقعية ذكية' },
  ];

  const handleTrackSelect = (trackName: string) => {
    setSelectedTrack(trackName);
    setCurrentScreen('form');
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const generateRegId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `AI-${year}-${random}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const regId = generateRegId();

    try {
      await addDoc(collection(db, 'trainee_detailed_data'), {
        registration_number: regId,
        track_name: selectedTrack,
        ...formData,
        created_at: serverTimestamp(),
      });

      setRegistrationId(regId);
      setCurrentScreen('success');
    } catch (err: any) {
      if (err.message && err.message.includes('Missing or insufficient permissions')) {
          try {
             handleFirestoreError(err, OperationType.CREATE, 'trainee_detailed_data');
          } catch(handleErr: any) {
             setError(handleErr.message || 'حدث خطأ في الصلاحيات أثناء الاتصال بقاعدة البيانات.');
          }
      } else {
          setError(err.message || 'حدث خطأ أثناء الاتصال بقاعدة البيانات. تأكد من إعداد Firebase بشكل صحيح.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openAdminDialog = () => {
    setIsMenuOpen(false);
    setShowAdminDialog(true);
    setAdminCode('');
    setAdminDialogError('');
  };

  const submitAdminCode = (e: FormEvent) => {
    e.preventDefault();
    if (adminCode === "555") {
      setShowAdminDialog(false);
      setCurrentScreen("admin");
      fetchTrainees();
    } else {
      setAdminDialogError("الرمز السري غير صحيح!");
    }
  };

  const handleLogout = () => {
    setCurrentScreen("welcome");
  };

  const fetchTrainees = async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const querySnapshot = await getDocs(collection(db, 'trainee_detailed_data'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrainees(data);
    } catch (err: any) {
      console.error(err);
      setAdminError("حدث خطأ أثناء جلب البيانات. يرجى التأكد من اتصالك بالإنترنت.");
    } finally {
      setAdminLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['رقم التسجيل', 'المسار', 'الاسم الأول', 'اسم الأب', 'المرحلة الدراسية', 'المدرسة', 'سبب الاختيار', 'المعرفة بالذكاء الاصطناعي', 'تاريخ التسجيل'];
    const csvRows = [headers.join(',')];

    trainees.forEach(row => {
      const date = row.created_at && row.created_at.toDate ? Math.floor(row.created_at.toDate().getTime()) : '';
      const dateStr = date ? new Date(date).toLocaleString('ar-EG') : '';
      
      const values = [
        row.registration_number,
        row.track_name,
        row.first_name,
        row.father_name,
        row.school_stage,
        row.school_name,
        `"${(row.reason_for_choosing || '').replace(/"/g, '""')}"`,
        `"${(row.ai_knowledge || '').replace(/"/g, '""')}"`,
        dateStr
      ];
      csvRows.push(values.join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trainees_report_${new Date().getTime()}.csv`;
    link.click();
  };

  const resetApp = () => {
    setCurrentScreen('welcome');
    setFormData({
      first_name: '',
      father_name: '',
      school_stage: '',
      school_name: '',
      reason_for_choosing: '',
      ai_knowledge: '',
    });
    setSelectedTrack('');
    setRegistrationId('');
    setError(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Top right Hamburger Menu */}
      <div className="absolute top-6 right-6 z-50 print:hidden">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white backdrop-blur-md"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm print:hidden"
          />
        )}
        {isMenuOpen && (
          <motion.div
            key="menu-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-[#030712]/90 border-l border-white/10 z-50 backdrop-blur-3xl p-8 flex flex-col print:hidden"
          >
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-6 left-6 p-2 text-gray-400 hover:text-white transition-colors"
              title="إغلاق"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-black text-white mt-12 mb-8">القائمة الرئيسية</h2>

            <div className="flex flex-col gap-4 flex-1">
              <button 
                onClick={openAdminDialog}
                className="flex items-center gap-3 w-full p-4 glass rounded-xl hover:bg-white/10 transition-colors text-right text-gray-200"
              >
                <BarChart className="w-5 h-5 text-sky-400" />
                لوحة المسئول
              </button>

              <a 
                href="https://wa.me/201030302005" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full p-4 glass rounded-xl hover:bg-white/10 transition-colors text-right text-gray-200"
              >
                <Phone className="w-5 h-5 text-emerald-400" />
                <div className="flex flex-col items-start gap-1">
                   <span>التواصل (واتساب)</span>
                   <span className="text-xs text-gray-400 font-mono" dir="ltr">01030302005</span>
                </div>
              </a>
            </div>

            <div className="pt-8 border-t border-white/10 mt-auto text-center">
              <p className="text-sm text-gray-400">إعداد وتصميم</p>
              <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-purple-400 mt-1">فوكس</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Access Modal */}
      <AnimatePresence>
        {showAdminDialog && (
          <motion.div
            key="admin-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdminDialog(false)}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm print:hidden"
          />
        )}
        {showAdminDialog && (
          <motion.div
            key="admin-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-[60] p-6 print:hidden"
          >
            <div className="glass rounded-3xl p-6 shadow-2xl relative border border-white/10 bg-[#030712]/90">
              <button 
                onClick={() => setShowAdminDialog(false)}
                className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-sky-500/20 text-sky-400 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">لوحة المسئول</h3>
                <p className="text-gray-400 text-sm mt-1">يرجى إدخال الرمز السري للمدير</p>
              </div>

              <form onSubmit={submitAdminCode} className="flex flex-col gap-4 text-right">
                {adminDialogError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center">
                    {adminDialogError}
                  </div>
                )}
                <input
                  type="password"
                  autoFocus
                  placeholder="الرمز السري..."
                  className="input-field text-center tracking-[0.5em] font-mono text-xl"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                />
                <button type="submit" className="btn-primary w-full mt-2">
                  دخول
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Blobs */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 -right-20 w-80 h-80 bg-sky-600/30 rounded-full blur-[100px] animate-blob" />
        <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-purple-600/30 rounded-full blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] animate-blob animation-delay-4000" />
      </div>

      <AnimatePresence mode="wait">
        {currentScreen === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl z-10 text-center flex flex-col items-center justify-center min-h-[60vh]"
          >
            <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ delay: 0.2 }}
               className="mb-8"
            >
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-48 h-48 drop-shadow-[0_0_40px_rgba(249,115,22,0.4)] mx-auto">
                <g transform="translate(10, 15) scale(0.8)">
                  <polygon fill="#E65100" points="50,90 20,40 50,20 80,40 " />
                  <polygon fill="#F57C00" points="0,0 20,40 50,20 " />
                  <polygon fill="#F57C00" points="100,0 80,40 50,20 " />
                  <polygon fill="#FFB74D" points="50,90 20,40 30,50 50,60 " />
                  <polygon fill="#FFCC80" points="50,90 80,40 70,50 50,60 " />
                  <polygon fill="#FFF" points="0,0 20,40 0,60 " />
                  <polygon fill="#FFF" points="100,0 80,40 100,60 " />
                  <polygon fill="#424242" points="50,90 45,85 55,85" />
                </g>
              </svg>
            </motion.div>
            <motion.h1 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.4 }}
               className="text-5xl md:text-6xl font-black mb-4 tracking-tight"
            >
              أكاديمية <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500 font-mono">FOX</span>
            </motion.h1>
            <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.6 }}
               className="text-xl md:text-2xl text-gray-300 font-bold mb-12"
            >
              للتدريب على الذكاء الاصطناعي
            </motion.p>

            <motion.button
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.8 }}
               onClick={() => setCurrentScreen('welcome')}
               className="btn-primary flex items-center gap-2 text-lg px-8 py-4 shadow-[0_0_20px_rgba(249,115,22,0.3)] bg-gradient-to-l from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 border-none"
            >
               دخول للأكاديمية
            </motion.button>
          </motion.div>
        )}

        {currentScreen === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl z-10 text-center"
          >
            <div className="mb-8 flex justify-center">
              <div className="w-20 h-20 glass flex items-center justify-center rounded-3xl shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                <BrainCircuit className="w-12 h-12 text-sky-400" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
              كورس الـ <span className="text-sky-500">AI</span> والـ <span className="text-emerald-500">Automation</span>
            </h1>
            <p className="text-gray-400 text-lg mb-12 max-w-2xl mx-auto">
              انطلق في رحلة احترافية لتعلم تقنيات الذكاء الاصطناعي وبناء أنظمة الأتمتة الذكية. اختر مسارك التدريبي واكتشف المستقبل اليوم.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tracks.map((track) => (
                <motion.div
                  key={track.id}
                  whileHover={{ y: -8 }}
                  onClick={() => handleTrackSelect(track.name)}
                  className="glass-card group text-center flex flex-col"
                >
                  <div className="mb-4 flex justify-center transform group-hover:scale-110 transition-transform">
                    {track.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{track.name}</h3>
                  <p className="text-sm text-gray-400 mb-6 flex-grow">{track.desc}</p>
                  <div className="mt-auto">
                    <button 
                      className="w-full py-2.5 rounded-xl bg-sky-500/10 text-sky-400 font-bold group-hover:bg-sky-500 group-hover:text-white transition-all flex items-center justify-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackSelect(track.name);
                      }}
                    >
                       انضم للمسار
                       <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {currentScreen === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-2xl z-10"
          >
            <div className="glass rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <AnimatePresence>
                {loading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-[#030712]/80 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl"
                  >
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 rounded-full border-t-4 border-sky-500 animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-r-4 border-emerald-500 animate-[spin_1.5s_linear_infinite_reverse]"></div>
                      <div className="absolute inset-4 rounded-full border-b-4 border-purple-500 animate-[spin_3s_linear_infinite]"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Rocket className="w-8 h-8 text-sky-400 animate-bounce" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 tracking-wide animate-pulse">جاري المعالجة...</h3>
                    <p className="text-sm text-sky-400">يرجى الانتظار وتأمين بياناتك</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={() => setCurrentScreen('welcome')}
                className="absolute top-6 left-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors text-sm"
              >
                رجوع
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="mb-8">
                <span className="inline-block px-3 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-full text-xs font-bold mb-3">
                  {selectedTrack}
                </span>
                <h2 className="text-2xl font-bold">تسجيل بيانات المتدرب</h2>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400"
                >
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 mr-2 text-right block">الاسم الأول</label>
                    <input
                      required
                      name="first_name"
                      placeholder="أدخل اسمك الأول"
                      className="input-field"
                      value={formData.first_name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 mr-2 text-right block">اسم الأب</label>
                    <input
                      required
                      name="father_name"
                      placeholder="أدخل اسم الأب"
                      className="input-field"
                      value={formData.father_name}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-gray-200 mr-2 text-right block">المرحلة الدراسية</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['ابتدائي', 'اعدادي', 'ثانوي'].map((stage) => (
                      <label 
                        key={stage}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                          formData.school_stage === stage 
                            ? 'bg-sky-500/20 border-sky-500/50 text-sky-400' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="school_stage"
                          value={stage}
                          checked={formData.school_stage === stage}
                          onChange={handleInputChange}
                          className="hidden"
                          required
                        />
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          formData.school_stage === stage ? 'border-sky-400' : 'border-gray-500'
                        }`}>
                          {formData.school_stage === stage && <div className="w-2 h-2 rounded-full bg-sky-400" />}
                        </div>
                        <span className="font-bold">{stage}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 mr-2 text-right block">المدرسة</label>
                  <input
                    required
                    name="school_name"
                    placeholder="اسم مدرستك الحالية"
                    className="input-field"
                    value={formData.school_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 mr-2 text-right block">لماذا اخترت هذا المسار؟</label>
                  <textarea
                    required
                    name="reason_for_choosing"
                    placeholder="اكتب بإيجاز عن سبب رغبتك في هذا المسار"
                    rows={3}
                    className="input-field resize-none"
                    value={formData.reason_for_choosing}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 mr-2 text-right block">ماذا تعرف عن الذكاء الاصطناعي (AI)؟</label>
                  <textarea
                    required
                    name="ai_knowledge"
                    placeholder="اكتب ما تعرفه من معلومات سابقة"
                    rows={3}
                    className="input-field resize-none"
                    value={formData.ai_knowledge}
                    onChange={handleInputChange}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full shadow-[0_0_20px_rgba(14,165,233,0.3)] mt-8"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    'تأكيد التسجيل الآن'
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {currentScreen === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg z-10 text-center"
          >
            <div className="glass rounded-3xl p-10 shadow-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                className="mb-6 flex justify-center"
              >
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
              </motion.div>

              <h2 className="text-3xl font-black mb-2 text-emerald-400">تم التسجيل بنجاح!</h2>
              <p className="text-gray-400 mb-8">لقد استلمنا طلب انضمامك للكورس. نتطلع لرؤيتك قريباً.</p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 relative">
                <p className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-wider">رقم التسجيل الفريد</p>
                <p className="text-4xl font-mono font-black text-sky-400 tracking-widest">{registrationId}</p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Info className="w-4 h-4" />
                  يرجى الاحتفاظ بهذا الرقم لمتابعة حالة طلبك
                </div>
              </div>

              <button
                onClick={resetApp}
                className="w-full py-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all font-bold"
              >
                العودة للبداية لتسجيل جديد
              </button>
            </div>
          </motion.div>
        )}

        {currentScreen === 'admin' && (
          <motion.div
             key="admin"
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.95 }}
             className="w-full max-w-6xl z-10 print:max-w-full print:m-0 print:p-0"
          >
             <div className="glass rounded-3xl p-8 shadow-2xl relative overflow-hidden print:shadow-none print:border-none print:bg-transparent print:p-0">
               <div className="flex flex-wrap justify-between items-center mb-8 gap-4 print:hidden">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCurrentScreen('welcome')}
                      className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors text-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                      رجوع للموقع
                    </button>
                  </div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                     <BarChart className="text-sky-400" />
                     إحصائيات التسجيل والطلاب
                  </h2>
                  <div className="flex gap-3 text-sm">
                     <button onClick={() => window.print()} className="bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl flex items-center gap-2 transition-colors">
                       <Printer className="w-4 h-4" />
                       طباعة / PDF
                     </button>
                     <button onClick={exportToCSV} disabled={trainees.length === 0} className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-4 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50">
                       <Download className="w-4 h-4" />
                       تصدير Excel
                     </button>
                  </div>
               </div>

               {adminLoading ? (
                 <div className="flex flex-col items-center justify-center py-20 text-sky-400 animate-pulse print:hidden">
                   <Loader2 className="w-12 h-12 animate-spin mb-4" />
                   <p>جاري سحب البيانات الآمنة...</p>
                 </div>
               ) : adminError ? (
                 <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-red-400 flex items-start gap-4 mx-auto max-w-2xl mt-12">
                   <AlertCircle className="w-10 h-10 shrink-0 mt-1" />
                   <div>
                     <h3 className="text-lg font-bold mb-2">خطأ</h3>
                     <p className="leading-relaxed text-sm opacity-90">{adminError}</p>
                   </div>
                 </div>
               ) : (
                 <>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                     <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                       <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                         <Users className="w-4 h-4" /> إجمالي المسجلين
                       </div>
                       <div className="text-4xl font-black text-sky-400">{trainees.length}</div>
                     </div>
                     {tracks.map(t => (
                       <div key={t.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                         <div className="text-gray-400 text-xs mb-2 truncate" title={t.name}>{t.name}</div>
                         <div className="text-3xl font-bold text-white">
                           {trainees.filter(tr => tr.track_name === t.name).length}
                         </div>
                       </div>
                     ))}
                   </div>

                   <div className="overflow-x-auto bg-white/5 rounded-2xl border border-white/10 print:border-gray-300">
                     <table className="w-full text-right text-sm">
                       <thead className="bg-white/10 text-gray-300 print:text-black">
                         <tr>
                           <th className="p-4 whitespace-nowrap border-b border-white/5 font-bold">رقم التسجيل</th>
                           <th className="p-4 whitespace-nowrap border-b border-white/5 font-bold">الاسم الثلاثي</th>
                           <th className="p-4 whitespace-nowrap border-b border-white/5 font-bold">المسار</th>
                           <th className="p-4 whitespace-nowrap border-b border-white/5 font-bold">المدرسة/الفرقة</th>
                           <th className="p-4 whitespace-nowrap border-b border-white/5 font-bold">تاريخ التسجيل</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 print:divide-gray-200">
                         {trainees.length === 0 ? (
                           <tr>
                              <td colSpan={5} className="p-8 text-center text-gray-400">لا يوجد بيانات لعرضها</td>
                           </tr>
                         ) : trainees.map((t, i) => (
                           <tr key={i} className="hover:bg-white/5 transition-colors print:text-black">
                             <td className="p-4 font-mono text-sky-400 print:text-black">{t.registration_number}</td>
                             <td className="p-4">{t.first_name} {t.father_name}</td>
                             <td className="p-4 text-emerald-400 text-xs print:text-black">{t.track_name}</td>
                             <td className="p-4 text-gray-300 text-xs print:text-black flex flex-col gap-1">
                               <span>{t.school_name}</span>
                               <span className="opacity-50">{t.school_stage || (t.grade ? `${t.grade} - ${t.division}` : '')}</span>
                             </td>
                             <td className="p-4 text-gray-400 text-xs print:text-black" dir="ltr">
                               {t.created_at?.toDate ? t.created_at.toDate().toLocaleString('ar-EG') : '---'}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </>
               )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-12 text-gray-600 text-xs z-10 flex flex-col items-center justify-center gap-2 print:hidden">
        <span>© {new Date().getFullYear()} AI & Automation Training Center - جميع الحقوق محفوظة</span>
        <span className="text-[10px] opacity-70">إعداد وتصميم: فوكس</span>
      </footer>
    </div>
  );
}
