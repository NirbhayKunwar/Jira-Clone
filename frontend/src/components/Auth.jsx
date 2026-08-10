import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuthStore } from '../store/authStore';

let googleInitialized = false;

export default function Auth({ initialView = 'login', onClose, onSuccess, initialEmail = '' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const routeState = location.state || {};
  const queryParams = new URLSearchParams(location.search);
  const invitedBy = queryParams.get('invitedBy') || routeState.invitedBy || '';
  const isSignUpPath = location.pathname === '/signup' || queryParams.get('signup') === 'true' || !!invitedBy;
  const initialEmailVal = queryParams.get('email') || routeState.email || initialEmail;
  const initialViewVal = isSignUpPath || routeState.isSignUp ? 'signup' : initialView;

  const [view, setView] = useState(initialViewVal); // 'login', 'signup', or 'forgot'
  const [email, setEmail] = useState(initialEmailVal);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0); // 0 to 4

  // Forgot password flow states
  const [forgotStep, setForgotStep] = useState(1); // 1: send OTP, 2: reset password
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Check password strength on change
  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (!val) {
      setPasswordStrength(0);
      return;
    }
    let strength = 0;
    if (val.length >= 6) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;
    setPasswordStrength(strength);
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (forgotStep === 1) {
        if (!email) {
          setError('Email is required');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to send OTP verification code.');
        }

        setSuccess('OTP verification code has been sent.');
        setForgotStep(2);
      } else {
        if (!otpCode) {
          setError('Verification code (OTP) is required');
          setLoading(false);
          return;
        }
        if (!newPassword || newPassword.length < 6) {
          setError('New password must be at least 6 characters long');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            otp: otpCode.trim(),
            newPassword: newPassword.trim()
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to change password. Please verify the code.');
        }

        setSuccess('Password updated successfully! Redirecting to sign in...');
        setTimeout(() => {
          setView('login');
          setForgotStep(1);
          setOtpCode('');
          setNewPassword('');
          setSuccess('');
          setError('');
        }, 2000);
      }
    } catch (err) {
      console.error('Forgot Password Flow Error:', err);
      setError(err.message || 'Something went wrong. Please check connection to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Basic validation
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (view === 'signup' && !name) {
      setError('Full name is required');
      return;
    }

    setLoading(true);
    
    try {
      const endpoint = view === 'signup' 
        ? `${API_URL}/api/auth/signup` 
        : `${API_URL}/api/auth/signin`;
      
      const body = view === 'signup' 
        ? { name, email, password, invitedBy } 
        : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      let data = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || 'Server error occurred. Please try again.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed. Please verify your details.');
      }

      setLoading(false);
      const userPayload = data.data?.user || data.user;
      const tokenPayload = data.data?.token || data.token;
      login(userPayload, tokenPayload);

      const inviteToken = queryParams.get('token');
      if (inviteToken) {
        try {
          await fetch(`${API_URL}/api/workspaces/invitations/accept`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`
            },
            body: JSON.stringify({ token: inviteToken })
          });
        } catch {
          // Fallback silently if auto-claimed upstream
        }
      }

      if (onSuccess) onSuccess(data.user);

    } catch (err) {
      console.error('Auth Form Submit Error:', err);
      setLoading(false);
      setError(err.message || 'Failed to connect to backend server. Make sure the server is running on port 5000.');
    }
  };

  const handleCredentialResponse = useCallback(async (response) => {
    try {
      const jwtToken = response.credential;
      if (!jwtToken) {
        setError('No credential returned from Google.');
        return;
      }
 
      setGoogleLoading(true);
      setError('');
      setSuccess('');
      
      // Send Google raw credential to backend endpoint for secure verification
      const backendRes = await fetch(`${API_URL}/api/auth/google-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: jwtToken
        })
      });
 
      const backendData = await backendRes.json();
 
      if (!backendRes.ok) {
        const detail = backendData.error?.message ? `: ${backendData.error.message}` : '';
        throw new Error(`${backendData.message || 'Google Sign-In backend verification failed.'}${detail}`);
      }
 
      setGoogleLoading(false);
      login(backendData.user, backendData.token);
      if (onSuccess) onSuccess(backendData.user);
    } catch (err) {
      console.error('Google Auth Verification/API Error:', err);
      setGoogleLoading(false);
      setError(err.message || 'An error occurred during Google Sign-In processing. Make sure the server is running.');
    }
  }, [login, onSuccess]);

  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google) {
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "304604649485-qd4b8f7asabkc2l9n2h3rmd5lfdlbv23.apps.googleusercontent.com";
        if (!googleInitialized) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse
          });
          googleInitialized = true;
        }

        const btnElement = document.getElementById("google-signin-btn");
        if (btnElement) {
          const isDark = document.documentElement.classList.contains('dark') || 
                         document.documentElement.getAttribute('data-theme')?.includes('dark');
          // Constraint width to prevent layout overflow on narrow mobile screens (e.g. 320px)
          const targetWidth = Math.min(btnElement.offsetWidth || 380, window.innerWidth - 32);
          window.google.accounts.id.renderButton(
            btnElement,
            { 
              theme: isDark ? "filled_blue" : "outline", 
              size: "large",
              text: "signin_with",
              shape: "rectangular",
              width: targetWidth >= 200 ? targetWidth : 280
            }
          );
        }
      }
    };

    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    } else {
      const timer = setTimeout(() => {
        initializeGoogle();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [view, handleCredentialResponse]);

  return (
    <div className="min-h-[100dvh] relative flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8 bg-dominant transition-colors duration-300 overflow-y-auto">
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none -z-20" />

      {/* Floating Header Actions (Back button) */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={handleClose}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl border border-border-secondary bg-card-secondary text-sm font-semibold text-text-secondary-muted hover:text-accent hover:border-accent shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
      </div>

      {/* Auth Main Card */}
      <div className="w-full max-w-md z-10 transition-all duration-300 transform scale-100 opacity-100 my-auto py-8">
        <div className="bg-card-secondary p-8 rounded-2xl border border-border-secondary/60 shadow-xl relative overflow-hidden">
          
          {/* Top Decorative accent border */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent via-accent-hover to-accent" />
          
          {/* Brand Logo */}
          <div className="flex justify-center mb-6 mt-2">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={handleClose}>
              <div className="w-8 h-8 flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                  <path d="M11.5 2C11.5 2 11.5 5.5 8 9C4.5 12.5 1 12.5 1 12.5L7.5 19L11.5 23L15 19.5L11.5 2Z" fill="var(--color-accent)" />
                  <path d="M23 12.5C23 12.5 19.5 12.5 16 9C12.5 5.5 12.5 2 12.5 2L16.5 6L20.5 10L23 12.5Z" fill="var(--color-accent-hover)" />
                  <path d="M12.5 22C12.5 22 16 22 19.5 18.5C23 15 23 11.5 23 11.5L19 15L15 19L12.5 22Z" fill="var(--color-accent)" opacity="0.8" />
                </svg>
              </div>
              <span className="font-display font-extrabold text-xl tracking-tight text-accent">
                Jira <span className="text-text-secondary font-normal">Clone</span>
              </span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="font-display font-extrabold text-2xl text-text-secondary">
              {view === 'login' ? 'Sign in to your account' : view === 'signup' ? 'Create your free account' : 'Reset your password'}
            </h2>
            <p className="text-xs text-text-secondary-muted mt-2">
              {view === 'login' 
                ? 'Welcome back! Please enter your details.' 
                : view === 'signup' 
                ? 'Start planning and building with your team in minutes.'
                : forgotStep === 1 
                ? 'Enter your email address to receive a 6-digit OTP code.' 
                : 'Enter the verification OTP and configure your new password.'}
            </p>
          </div>

          {/* Error and Success Banners */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-600 dark:text-green-400 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={view === 'forgot' ? handleForgotPasswordSubmit : handleFormSubmit} className="space-y-4">
            {view === 'forgot' ? (
              forgotStep === 1 ? (
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-text-secondary mb-1.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary-muted">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      disabled={loading}
                      className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all min-h-[44px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">

                  <div>
                    <label htmlFor="otp-code" className="block text-xs font-semibold text-text-secondary mb-1.5">Verification Code (OTP)</label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      maxLength="6"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit code"
                      disabled={loading}
                      className="block w-full px-3 py-2.5 text-center text-sm font-mono tracking-widest font-bold rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-password" className="block text-xs font-semibold text-text-secondary mb-1.5">New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary-muted">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Configure new password"
                        disabled={loading}
                        className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary-muted hover:text-text-secondary transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <>
                {view === 'signup' && (
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-text-secondary mb-1.5">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary-muted">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        autoComplete="name"
                        disabled={loading || googleLoading}
                        className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all min-h-[44px]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-text-secondary mb-1.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary-muted">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="username"
                      disabled={loading || googleLoading}
                      className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold text-text-secondary">Password</label>
                    {view === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setView('forgot');
                          setForgotStep(1);
                          setOtpCode('');
                          setNewPassword('');
                          setError('');
                          setSuccess('');
                        }}
                        className="text-[11px] font-semibold text-accent hover:underline hover:text-accent-hover transition-colors border-none bg-transparent cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                      disabled={loading || googleLoading}
                      className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary-muted hover:text-text-secondary transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>

                  {/* Password strength indicator for signup */}
                  {view === 'signup' && password && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex space-x-1 h-1">
                        {[1, 2, 3, 4].map((bar) => (
                          <div
                            key={bar}
                            className={`h-full flex-grow rounded-full transition-all duration-300 ${
                              bar <= passwordStrength
                                ? passwordStrength === 1
                                  ? 'bg-red-500'
                                  : passwordStrength === 2
                                  ? 'bg-amber-500'
                                  : passwordStrength === 3
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                                : 'bg-border-secondary'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[9px] text-text-secondary-muted">
                        <span>Password Strength</span>
                        <span className="font-semibold uppercase">
                          {passwordStrength === 1 && 'Weak'}
                          {passwordStrength === 2 && 'Fair'}
                          {passwordStrength === 3 && 'Good'}
                          {passwordStrength === 4 && 'Strong'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {view === 'signup' ? (
                  <div className="flex items-start">
                    <input
                      id="terms"
                      type="checkbox"
                      required
                      className="h-4 w-4 mt-0.5 rounded border-border-secondary text-accent focus:ring-accent accent-accent bg-dominant cursor-pointer"
                    />
                    <label htmlFor="terms" className="ml-2 block text-xs text-text-secondary-muted leading-relaxed">
                      I agree to the <a href="#" onClick={(e) => e.preventDefault()} className="text-accent hover:underline">Terms of Service</a> and <a href="#" onClick={(e) => e.preventDefault()} className="text-accent hover:underline">Privacy Policy</a>.
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded border-border-secondary text-accent focus:ring-accent accent-accent bg-dominant cursor-pointer"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-xs text-text-secondary-muted cursor-pointer select-none">
                        Keep me signed in
                      </label>
                    </div>
                  </div>
                )}
              </>
            )}

            {view === 'forgot' ? (
              <div className="space-y-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent shadow-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4.5 h-4.5 mr-2 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{forgotStep === 1 ? 'Send OTP Verification' : 'Reset Password'}</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setView('login');
                      setForgotStep(1);
                      setOtpCode('');
                      setNewPassword('');
                      setError('');
                      setSuccess('');
                    }}
                    className="text-xs font-bold text-accent hover:text-accent-hover hover:underline focus:outline-none cursor-pointer border-none bg-transparent"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent shadow-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer min-h-[44px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 mr-2 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{view === 'login' ? 'Sign In' : 'Get Started'}</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </button>
            )}
          </form>

          {view !== 'forgot' && (
            <>
              {/* Divider */}
              <div className="my-6 flex items-center justify-between">
                <span className="w-full border-b border-border-secondary/50" />
                <span className="text-[10px] text-text-secondary-muted px-3 uppercase tracking-wider font-semibold whitespace-nowrap">or continue with</span>
                <span className="w-full border-b border-border-secondary/50" />
              </div>

              {/* Social Logins */}
              <div className="w-full flex justify-center">
                <div id="google-signin-btn" className="w-full min-h-[44px] flex justify-center" />
              </div>

              {/* Toggle Login/Signup */}
              <div className="mt-6 text-center text-xs">
                <span className="text-text-secondary-muted">
                  {view === 'login' ? "Don't have an account?" : "Already have an Atlassian account?"}
                </span>{' '}
                <button
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setView(view === 'login' ? 'signup' : 'login');
                  }}
                  className="font-bold text-accent hover:text-accent-hover focus:outline-none cursor-pointer"
                >
                  {view === 'login' ? 'Sign up free' : 'Log in here'}
                </button>
              </div>
            </>
          )}

        </div>

        {/* Bottom Security Assurance */}
        <div className="mt-4 flex items-center justify-center space-x-2 text-[10px] text-text-secondary-muted font-semibold tracking-wide uppercase">
          <ShieldCheck className="w-4 h-4 text-jira-green" />
          <span>Atlassian Identity Protection Secure Authentication</span>
        </div>
      </div>
    </div>
  );
}
