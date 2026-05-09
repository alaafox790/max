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
  BarChart,
  Home
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
  mobile_number: string;
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
    mobile_number: '',
    school_stage: '',
    school_name: '',
    reason_for_choosing: '',
    ai_knowledge: '',
  });

  const tracks = [
    { id: 'automation', name: 'مسار الأتمتة (Automation)', icon: <RotateCcw strokeWidth={1.5} className="w-8 h-8 text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]" />, desc: 'تعلم كيف تجعل الآلات تعمل نيابة عنك وتحسّن أداء عملك' },
    { id: 'agent', name: 'بناء وكيل ذكي (AI Agent)', icon: <Bot strokeWidth={1.5} className="w-8 h-8 text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]" />, desc: 'صمم وكلاء أذكياء يتفاعلون بشكل مستقل لحل المشكلات المعقدة' },
    { id: 'apps', name: 'بناء تطبيقات متنوعة', icon: <Rocket strokeWidth={1.5} className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />, desc: 'حول أفكارك إلى تطبيقات واقعية ذكية ومبتكرة' },
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

    const mobileNumber = formData.mobile_number.trim();
    if (!/^\d{11}$/.test(mobileNumber)) {
      setError('يجب أن يتكون رقم الموبايل من 11 رَقَم');
      setLoading(false);
      return;
    }

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
    const headers = ['رقم التسجيل', 'المسار', 'الاسم الأول', 'اسم الأب', 'رقم الموبايل', 'المرحلة الدراسية', 'المدرسة', 'سبب الاختيار', 'المعرفة بالذكاء الاصطناعي', 'تاريخ التسجيل'];
    const csvRows = [headers.join(',')];

    trainees.forEach(row => {
      const date = row.created_at && row.created_at.toDate ? Math.floor(row.created_at.toDate().getTime()) : '';
      const dateStr = date ? new Date(date).toLocaleString('ar-EG') : '';
      
      const values = [
        row.registration_number,
        row.track_name,
        row.first_name,
        row.father_name,
        row.mobile_number || '',
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
      mobile_number: '',
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
    <div className="min-h-screen bg-[#030712] relative overflow-hidden">
      {/* Top right Hamburger Menu */}
      <div className="fixed top-6 right-6 z-50 print:hidden">
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

      <motion.div
        animate={{ 
          scale: isMenuOpen ? 0.95 : 1,
          opacity: isMenuOpen ? 0.5 : 1,
          borderRadius: isMenuOpen ? "24px" : "0px",
          x: isMenuOpen ? -16 : 0
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="min-h-screen flex flex-col items-center justify-center p-4 relative origin-center"
      >
        {/* Background Blobs */}
        <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
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
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               transition={{ delay: 0.8 }}
               onClick={() => setCurrentScreen('welcome')}
               className="group relative flex items-center justify-center gap-2 text-lg px-10 py-5 rounded-2xl overflow-hidden font-bold shadow-[0_0_40px_rgba(249,115,22,0.3)] hover:shadow-[0_0_60px_rgba(249,115,22,0.5)] transition-shadow duration-500 border border-orange-500/30 hover:border-transparent"
            >
               <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               <div className="absolute inset-0 bg-white/5 group-hover:bg-transparent transition-colors duration-500" />
               <span className="relative z-10 flex items-center gap-2 text-orange-400 group-hover:text-gray-900 transition-colors duration-300">
                 دخول للأكاديمية
                 <ChevronRight className="w-5 h-5 text-orange-400 group-hover:text-gray-900 rotate-180 transition-colors" />
               </span>
            </motion.button>
          </motion.div>
        )}

        {currentScreen === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
            className="w-full max-w-4xl z-10 text-center mt-10 md:mt-0"
          >
            <motion.div 
              initial={{ y: 0 }}
              animate={{ y: [-8, 8, -8] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="mb-10 flex justify-center relative perspective-container"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-sky-500/20 blur-[80px] rounded-full point-events-none" />
              <div className="relative w-28 h-28 bg-gradient-to-b from-[#1e293b]/80 to-[#0f172a]/90 border border-white/10 flex items-center justify-center rounded-[2.5rem] shadow-[inset_0_1px_rgba(255,255,255,0.2),_0_20px_40px_rgba(0,0,0,0.5),_0_0_40px_rgba(14,165,233,0.3)] overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-sky-400/20 via-transparent to-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <BrainCircuit strokeWidth={1.5} className="w-14 h-14 text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.6)] transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500" />
              </div>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight text-white"
            >
              مسارك نحو احتراف <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-tl from-sky-400 to-sky-600 block sm:inline mt-2 sm:mt-0">الذكاء الاصطناعي</span>
              <span className="text-gray-500/50 mx-2 md:mx-4 font-light text-2xl md:text-4xl hidden sm:inline-block">&amp;</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-600 block sm:inline mt-2 sm:mt-0">الأتمتة</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-400 text-lg md:text-xl mb-14 max-w-2xl mx-auto leading-relaxed font-medium"
            >
              انطلق في رحلة احترافية لتعلم تقنيات العصر وبناء أنظمة ذكية مبتكرة. اختر مسارك التدريبي واصنع مستقبلك اليوم.
            </motion.p>

            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.15
                  }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10"
            >
              {tracks.map((track) => (
                <motion.div
                  key={track.id}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  onClick={() => handleTrackSelect(track.name)}
                  className="bg-[#0f172a]/60 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] rounded-[1.5rem] p-6 transition-all duration-300 hover:bg-[#1e293b]/60 hover:shadow-sky-500/20 group text-center flex flex-col relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="mb-4 flex justify-center transform group-hover:scale-110 transition-all duration-500 relative z-10">
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/5 shadow-inner flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-sky-500/20 group-hover:to-emerald-500/20 group-hover:border-white/10 transition-all duration-500">
                      {track.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-100 group-hover:text-sky-300 transition-colors">{track.name}</h3>
                  <p className="text-xs text-gray-400 mb-5 flex-grow leading-relaxed font-medium group-hover:text-gray-300 transition-colors">{track.desc}</p>
                  <div className="mt-auto relative z-10">
                    <button 
                      className="w-full py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-bold group-hover:bg-gradient-to-r group-hover:from-sky-500 group-hover:to-blue-600 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] group-hover:border-transparent transition-all flex items-center justify-center gap-2 overflow-hidden relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackSelect(track.name);
                      }}
                    >
                       <span className="relative z-10">انضم للمسار</span>
                       <ChevronRight className="w-5 h-5 rotate-180 relative z-10" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {currentScreen === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-3xl z-10 my-8"
          >
            <div className="bg-gradient-to-br from-[#1e293b]/70 to-[#0f172a]/90 backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6),_0_0_40px_rgba(14,165,233,0.1)] rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 blur-[100px] rounded-full point-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full point-events-none" />
              
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

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 mr-2 text-right block">رقم الموبايل</label>
                  <input
                    required
                    type="tel"
                    name="mobile_number"
                    placeholder="أدخل رقم الموبايل (11 رقم)"
                    className="input-field text-left text-lg tracking-wider"
                    value={formData.mobile_number}
                    onChange={handleInputChange}
                    dir="ltr"
                    maxLength={11}
                  />
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg z-10 text-center"
          >
            <div className="glass rounded-3xl p-1 relative overflow-hidden bg-gradient-to-b from-sky-500/20 to-transparent">
              <div className="absolute inset-0 bg-grid-white/[0.02]" />
              <div className="bg-[#030712]/90 backdrop-blur-xl rounded-[23px] p-10 relative border border-white/10 shadow-2xl">
                
                {/* Check Animation */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                  className="mb-8 flex justify-center relative"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl"
                  />
                  <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 rounded-2xl rotate-45 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 -rotate-45" />
                  </div>
                </motion.div>

                <motion.h2 
                  initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
                  className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400"
                >
                  تم التسجيل بنجاح!
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-400 mb-8"
                >
                  لقد استلمنا طلب انضمامك للكورس. نتطلع لرؤيتك قريباً.
                </motion.p>

                {/* Digital Ticket Pattern */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
                  className="relative mb-8"
                >
                  {/* Glowing line separating */}
                  <div className="absolute -left-10 right-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
                  <div className="absolute -left-10 right-10 bottom-0 h-px w-full bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
                  
                  <div className="bg-sky-950/30 border border-sky-500/20 rounded-2xl p-8 relative overflow-hidden backdrop-blur-md">
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-sky-400" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-sky-400" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-sky-400" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-sky-400" />
                    
                    <motion.div 
                      className="absolute inset-0 bg-sky-500/5 opacity-0 hover:opacity-100 transition-opacity blur-xl z-0"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 4 }}
                    />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <BrainCircuit className="w-5 h-5 text-sky-400 opacity-70 animate-pulse" />
                        <p className="text-xs text-sky-200/70 font-bold uppercase tracking-[0.2em] relative z-10">
                          رقم التسجيل الفريد
                        </p>
                      </div>
                      
                      <motion.p 
                        initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                        className="text-4xl sm:text-5xl font-mono font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]"
                      >
                        {registrationId}
                      </motion.p>
                      
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-6 flex items-center justify-center gap-2 text-xs text-sky-200/50 bg-sky-950/50 py-2 px-4 rounded-xl border border-sky-500/10 inline-flex"
                      >
                        <Info className="w-4 h-4 text-sky-400 shrink-0" />
                        يرجى الاحتفاظ بهذا الرقم لمتابعة حالة طلبك
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  onClick={resetApp}
                  className="w-full py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all font-bold text-gray-200 flex items-center justify-center gap-2"
                >
                  العودة للبداية لتسجيل جديد
                  <Home className="w-5 h-5 ml-2 mr-0" />
                </motion.button>
              </div>
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
                           <th className="p-4 whitespace-nowrap border-b border-white/5 font-bold">رقم الموبايل</th>
                           <th className="p-4 whitespace-nowrap border-b border-white/5 font-bold">المسار</th>
                           <th className="p-4 whitespace-nowrap border-b border-white/5 font-bold">المدرسة/الفرقة</th>
                           <th className="p-4 whitespace-nowrap border-b border-white/5 font-bold">تاريخ التسجيل</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 print:divide-gray-200">
                         {trainees.length === 0 ? (
                           <tr>
                             <td colSpan={6} className="p-8 text-center text-gray-400">لا يوجد بيانات لعرضها</td>
                           </tr>
                         ) : trainees.map((t, i) => (
                           <tr key={i} className="hover:bg-white/5 transition-colors print:text-black">
                             <td className="p-4 font-mono text-sky-400 print:text-black">{t.registration_number}</td>
                             <td className="p-4">{t.first_name} {t.father_name}</td>
                             <td className="p-4 text-gray-300 font-mono text-left" dir="ltr">{t.mobile_number || '---'}</td>
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
      </motion.div>
    </div>
  );
}
