import { useState } from 'react';
import { User, Mail, Briefcase, MapPin, Key, ShieldCheck, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuthStore } from '../store/authStore';

export default function ProfileSettings() {
  const { user, updateProfile } = useAuthStore();
  // Account Details States
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'Full Stack Engineer');
  const [dept, setDept] = useState(user?.dept || 'Core Engineering');
  const [location, setLocation] = useState(user?.location || 'San Francisco, CA');
  const [email] = useState(user?.email || ''); // Keep email read-only for security simulation

  // Password & OTP Verification States
  const [otpValue, setOtpValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Status Banners
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Send OTP with Resend Countdown Timer
  const handleSendOtp = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!email) {
      setPasswordError('No email associated with this account.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP.');
      }

      setOtpSent(true);
      setOtpCountdown(60);
      setPasswordSuccess('Verification code sent! Please check your email inbox.');

      const interval = setInterval(() => {
        setOtpCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Send OTP Error:', error);
      setPasswordError(error.message || 'Failed to request OTP. Make sure the backend server is running.');
    }
  };

  // Handle Password Strength Check
  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setNewPassword(val);
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

  // Save Account Profile Changes
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Full Name cannot be empty.');
      return;
    }

    try {
      const token = localStorage.getItem('jira_token');
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name,
          role,
          dept,
          location,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile details.');
      }

      // Update global user state (Zustand authStore)
      updateProfile({
        ...user,
        name: data.user.name,
        role: data.user.role,
        dept: data.user.dept,
        location: data.user.location,
        hasConfiguredWorkspace: data.user.hasConfiguredWorkspace
      });

      setProfileSuccess('Profile details updated successfully in database.');
    } catch (error) {
      console.error('Profile Update Error:', error);
      setProfileError(error.message || 'Failed to update profile. Make sure the backend server is running.');
    }
  };

  // Update Password with OTP verification
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!otpSent) {
      setPasswordError('Please request an OTP verification code first.');
      return;
    }
    if (!otpValue) {
      setPasswordError('Please enter the 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Confirm Password does not match New Password.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: otpValue,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password.');
      }

      setPasswordSuccess('Password updated successfully on the backend.');
      setOtpSent(false);
      setOtpValue('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStrength(0);
    } catch (error) {
      console.error('Password Update Error:', error);
      setPasswordError(error.message || 'Failed to update password. Make sure the backend server is running.');
    }
  };

  // Get User Avatar Initials
  const getUserInitials = () => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-8 animate-[fade-in_200ms_ease-out]">
      
      {/* Title */}
      <div>
        <h3 className="font-bold text-text-secondary text-lg">Profile Settings</h3>
        <p className="text-xs text-text-secondary-muted mt-0.5">Manage your workspace account preferences and login security settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Forms */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Account Details */}
          <div className="bg-card-secondary p-6 rounded-xl border border-border-secondary/60 shadow-sm space-y-4">
            <h4 className="font-bold text-text-secondary text-sm border-b border-border-secondary/40 pb-3 flex items-center space-x-2">
              <User className="w-4.5 h-4.5 text-accent" />
              <span>Workspace Details</span>
            </h4>

            {profileError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-600 dark:text-green-400 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-name" className="block text-xs font-semibold text-text-secondary mb-1.5">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary-muted">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="prof-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="prof-email" className="block text-xs font-semibold text-text-secondary mb-1.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary-muted">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="prof-email"
                      type="email"
                      disabled
                      value={email}
                      className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-border-secondary bg-dominant-offset/40 text-text-secondary-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-role" className="block text-xs font-semibold text-text-secondary mb-1.5">Job Title</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary-muted">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <select
                      id="prof-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    >
                      <option value="Full Stack Engineer">Full Stack Engineer</option>
                      <option value="Frontend UI/UX Designer">Frontend UI/UX Designer</option>
                      <option value="Lead Backend Developer">Lead Backend Developer</option>
                      <option value="DevOps & Infrastructure Engineer">DevOps & Infrastructure Engineer</option>
                      <option value="Product Manager">Product Manager</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="prof-dept" className="block text-xs font-semibold text-text-secondary mb-1.5">Department</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary-muted">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <input
                      id="prof-dept"
                      type="text"
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      placeholder="Core Engineering"
                      className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="prof-location" className="block text-xs font-semibold text-text-secondary mb-1.5">Office Location</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary-muted">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    id="prof-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="San Francisco, CA"
                    className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border-secondary/40">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer border-none"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>

          {/* Section 2: Security & Credentials */}
          <div className="bg-card-secondary p-6 rounded-xl border border-border-secondary/60 shadow-sm space-y-4">
            <h4 className="font-bold text-text-secondary text-sm border-b border-border-secondary/40 pb-3 flex items-center space-x-2">
              <Key className="w-4.5 h-4.5 text-accent" />
              <span>Change Password</span>
            </h4>

            {passwordError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-600 dark:text-green-400 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSave} className="space-y-4">
              
              <div>
                <label htmlFor="sec-otp" className="block text-xs font-semibold text-text-secondary mb-1.5">Verification OTP</label>
                <div className="flex space-x-3">
                  <input
                    id="sec-otp"
                    type="text"
                    maxLength="6"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    disabled={!otpSent}
                    className="block w-full px-3.5 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpCountdown > 0}
                    className="px-4 py-2.5 rounded-lg border border-border-secondary text-xs font-bold hover:bg-dominant-offset transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap bg-transparent text-text-secondary-muted hover:text-text-secondary"
                  >
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : otpSent ? 'Resend OTP' : 'Send OTP'}
                  </button>
                </div>
                {otpSent && (
                  <p className="text-[10px] text-green-500 font-semibold mt-1">
                    Verification code sent. Please check your Gmail inbox.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sec-new" className="block text-xs font-semibold text-text-secondary mb-1.5">New Password</label>
                  <input
                    id="sec-new"
                    type="password"
                    value={newPassword}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    className="block w-full px-3.5 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                  />
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className="flex space-x-1 h-1">
                        {[1, 2, 3, 4].map((bar) => (
                          <div
                            key={bar}
                            className={`h-full flex-grow rounded-full transition-all duration-300 ${
                              bar <= passwordStrength
                                ? passwordStrength === 1 ? 'bg-red-500' : passwordStrength === 2 ? 'bg-amber-500' : passwordStrength === 3 ? 'bg-yellow-500' : 'bg-green-500'
                                : 'bg-border-secondary'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[9px] text-text-secondary-muted">
                        <span>Strength</span>
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

                <div>
                  <label htmlFor="sec-confirm" className="block text-xs font-semibold text-text-secondary mb-1.5">Confirm New Password</label>
                  <input
                    id="sec-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full px-3.5 py-2.5 text-sm rounded-lg border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-dominant text-text-secondary transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border-secondary/40">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer border-none"
                >
                  Update Password
                </button>
              </div>

            </form>
          </div>

        </div>

        {/* Right Column: Cards */}
        <div className="space-y-6">
          
          {/* User Preview Card */}
          <div className="bg-card-secondary rounded-xl border border-border-secondary/60 p-6 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-accent to-accent-hover" />
            
            <div className="relative pt-6 flex flex-col items-center">
              {/* Avatar upload wrapper */}
              <div className="relative group/avatar cursor-pointer mb-4">
                {user?.picture ? (
                  <img src={user.picture} alt={name} className="w-24 h-24 rounded-full border-4 border-card-secondary shadow-md object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-accent-light text-accent text-3xl font-extrabold flex items-center justify-center border-4 border-card-secondary shadow-md">
                    {getUserInitials()}
                  </div>
                )}
                {/* Simulated Hover upload action */}
                <div className="absolute inset-0 bg-slate-900/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity border-4 border-card-secondary">
                  <Camera className="w-6 h-6" />
                </div>
              </div>

              <h4 className="font-display font-extrabold text-text-secondary text-base mt-2">{name}</h4>
              <p className="text-xs text-accent font-semibold">{role}</p>
              <p className="text-[10px] text-text-secondary-muted mt-1 uppercase tracking-wide font-bold">{dept}</p>

              <div className="w-full border-t border-border-secondary/40 my-4" />

              <div className="w-full text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-secondary-muted font-medium">Location</span>
                  <span className="font-semibold text-text-secondary">{location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary-muted font-medium">Timezone</span>
                  <span className="font-semibold text-text-secondary">UTC-8 (PST)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary-muted font-medium">Account Status</span>
                  <span className="font-semibold text-green-500">Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Status Card */}
          <div className="bg-card-secondary rounded-xl border border-border-secondary/60 p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-text-secondary text-sm border-b border-border-secondary/40 pb-3 flex items-center space-x-2">
              <ShieldCheck className="w-4.5 h-4.5 text-accent" />
              <span>Identity Integrations</span>
            </h4>

            <div className="space-y-3.5">
              {/* Google Integration */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-dominant border border-border-secondary/40">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <div>
                    <span className="block text-xs font-bold text-text-secondary">Google OAuth</span>
                    <span className="block text-[9px] text-text-secondary-muted mt-0.5">Single Sign-On</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[8px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 rounded uppercase tracking-wider">
                  Connected
                </span>
              </div>

              {/* Active Directory / LDAP Integration */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-dominant border border-border-secondary/40">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 text-accent font-bold text-[10px] flex items-center justify-center bg-accent-light rounded">AD</div>
                  <div>
                    <span className="block text-xs font-bold text-text-secondary">Active Directory</span>
                    <span className="block text-[9px] text-text-secondary-muted mt-0.5">LDAP Directory Sync</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[8px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 rounded uppercase tracking-wider">
                  Active
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
