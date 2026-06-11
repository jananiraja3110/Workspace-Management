import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  useEffect(() => {
    if (step === 'otp') otpRefs.current[0]?.focus();
  }, [step]);

  const handleCredentials = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Email is required');
    if (!password.trim()) return toast.error('Password is required');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('OTP sent to your email');
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return toast.error('Enter the 6-digit OTP');
    setLoading(true);
    try {
      const data = await verifyOtp(email, code);
      toast.success('Login successful!');
      if (data.user?.mustChangePassword) {
        navigate('/change-password');
      } else {
        const redirect = localStorage.getItem('redirectAfterLogin');
        if (redirect) {
          localStorage.removeItem('redirectAfterLogin');
          navigate(redirect);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const Branding = () => (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
            <span className="text-white font-bold text-lg">AD</span>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">AD Workspace</span>
        </div>
        <h2 className="text-4xl font-extrabold text-white leading-tight">
          Your Complete<br />Office Management<br />Platform
        </h2>
        <p className="mt-6 text-indigo-200 text-lg leading-relaxed max-w-md">
          Tasks, attendance, leave, messaging, and 30+ more tools — all in one place.
        </p>
        <div className="mt-12 flex items-center gap-4">
          <div className="flex -space-x-2">
            {['bg-indigo-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400'].map((bg, i) => (
              <div key={i} className={`w-8 h-8 ${bg} rounded-full border-2 border-indigo-700`} />
            ))}
          </div>
          <p className="text-indigo-300 text-sm">Trusted by teams worldwide</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <Branding />

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 sm:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200/50 mb-4">
              <span className="text-white font-bold text-xl">AD</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 dark:border-slate-700 p-8">

            {step === 'credentials' ? (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1.5">Sign in to your workspace account</p>
                </div>

                <form onSubmit={handleCredentials} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100 placeholder-slate-400 bg-slate-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-700"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 dark:text-slate-100 placeholder-slate-400 bg-slate-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-700"
                        placeholder="Enter your password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5">
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                      Forgot Password?
                    </Link>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50">
                    {loading ? (
                      <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>Sending OTP...</>
                    ) : 'Continue'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <div className="w-14 h-14 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4">
                    <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Check your email</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
                    We sent a 6-digit OTP to<br />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 text-center">Enter OTP</label>
                    <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => otpRefs.current[idx] = el}
                          type="text" inputMode="numeric" maxLength={1} value={digit}
                          onChange={e => handleOtpChange(e.target.value, idx)}
                          onKeyDown={e => handleOtpKeyDown(e, idx)}
                          className="w-11 h-12 text-center text-lg font-bold border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        />
                      ))}
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-3">OTP valid for 10 minutes</p>
                  </div>

                  <button type="submit" disabled={loading || otp.join('').length < 6}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-indigo-800 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50">
                    {loading ? (
                      <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>Verifying...</>
                    ) : 'Verify & Sign In'}
                  </button>

                  <button type="button" onClick={() => { setStep('credentials'); setOtp(['','','','','','']); }}
                    className="w-full text-sm text-slate-500 hover:text-indigo-600 transition-colors text-center">
                    ← Use a different account
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
