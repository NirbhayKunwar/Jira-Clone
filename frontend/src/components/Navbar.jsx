import { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown, Search, ArrowRight, Sun, Moon, Palette, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const THEMES = [
  { id: 'atlassian', name: 'Atlassian Blue (Default)', colorBg: 'bg-[#0052cc]' },
  { id: 'emerald', name: 'Emerald Forest', colorBg: 'bg-[#10b981]' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', colorBg: 'bg-[#db2777]' },
  { id: 'sunset', name: 'Sunset Amber', colorBg: 'bg-[#d97706]' }
];

export default function Navbar({ onNavigate }) {
  const { theme, mode, resolvedMode, setTheme, setMode, toggleMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    
    // Close theme picker on click outside
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowThemePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navLinks = [
    {
      name: 'Products',
      items: [
        { title: 'Jira Software', desc: 'Project and issue tracking for agile teams', badge: 'Popular' },
        { title: 'Jira Service Management', desc: 'High-velocity ITSM for dev, IT, and business ops' },
        { title: 'Jira Product Discovery', desc: 'Prioritization and roadmapping for product managers' },
        { title: 'Confluence', desc: 'Collaborative workspace for documentation' }
      ]
    },
    {
      name: 'Solutions',
      items: [
        { title: 'Agile & DevOps', desc: 'Connect code commits to issues and release with confidence' },
        { title: 'IT Service Management', desc: 'Deliver exceptional service experiences fast' },
        { title: 'Business Management', desc: 'Organize team tasks, marketing campaigns, and budgets' },
        { title: 'Enterprise Solutions', desc: 'Scale securely with high availability and advanced security' }
      ]
    },
    {
      name: 'Templates',
      items: [
        { title: 'Kanban Board', desc: 'Visualize work and optimize workflow efficiency' },
        { title: 'Scrum Board', desc: 'Manage sprints, backlogs, and team velocity' },
        { title: 'Project Roadmap', desc: 'Plan releases and track epic progress over time' },
        { title: 'Bug Tracking', desc: 'Log, prioritize, and fix software defects' }
      ]
    },
    {
      name: 'Resources',
      items: [
        { title: 'Jira Community', desc: 'Connect with fellow users and experts' },
        { title: 'Agile Coach', desc: 'Learn agile methodologies and best practices' },
        { title: 'Product Guides', desc: 'Step-by-step tutorials and documentation' },
        { title: 'What\'s New', desc: 'Latest features, releases, and roadmap updates' }
      ]
    }
  ];

  return (
    <header className={`fixed top-0 left-0 w-full z-50 ${
      scrolled 
        ? 'bg-dominant-offset shadow-md border-b border-border-secondary/40 py-3' 
        : 'bg-dominant border-b border-border-secondary/20 py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Left Navigation */}
          <div className="flex items-center space-x-8">
            <a href="#" className="flex items-center space-x-2 group">
              <div className="relative w-8 h-8 flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                  <path d="M11.5 2C11.5 2 11.5 5.5 8 9C4.5 12.5 1 12.5 1 12.5L7.5 19L11.5 23L15 19.5L11.5 2Z" fill="var(--color-accent)" />
                  <path d="M23 12.5C23 12.5 19.5 12.5 16 9C12.5 5.5 12.5 2 12.5 2L16.5 6L20.5 10L23 12.5Z" fill="var(--color-accent-hover)" />
                  <path d="M12.5 22C12.5 22 16 22 19.5 18.5C23 15 23 11.5 23 11.5L19 15L15 19L12.5 22Z" fill="var(--color-accent)" opacity="0.8" />
                </svg>
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-accent flex items-center">
                Jira <span className="text-text-secondary font-normal ml-1">Clone</span>
              </span>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-2">
              {navLinks.map((link, idx) => (
                <div 
                  key={idx}
                  className="relative group"
                  onMouseEnter={() => setActiveDropdown(idx)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button className="flex items-center px-3 py-2 text-[15px] font-medium text-text-secondary-muted hover:text-accent hover:bg-dominant-offset rounded-md cursor-pointer transition-all duration-200">
                    <span>{link.name}</span>
                    <ChevronDown className={`ml-1 w-4 h-4 transition-transform duration-200 ${activeDropdown === idx ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <div className={`absolute left-0 mt-1 w-96 bg-card-secondary rounded-xl shadow-xl border border-border-secondary p-4 transform origin-top-left transition-all duration-200 ${
                    activeDropdown === idx 
                      ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}>
                    <div className="grid gap-4">
                      {link.items.map((item, itemIdx) => (
                        <a 
                          key={itemIdx} 
                          href="#" 
                          className="flex items-start p-2.5 rounded-lg hover:bg-dominant-offset group/item transition-all duration-200"
                        >
                          <div className="flex-1">
                            <div className="flex items-center font-semibold text-text-secondary text-sm group-hover/item:text-accent transition-colors duration-200">
                              {item.title}
                              {item.badge && (
                                <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-accent-light text-accent font-bold rounded-full uppercase tracking-wider">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-secondary-muted mt-0.5 line-clamp-2 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-transparent group-hover/item:text-accent group-hover/item:translate-x-1 transition-all duration-200 self-center" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <a href="#" className="px-3 py-2 text-[15px] font-medium text-text-secondary-muted hover:text-accent hover:bg-dominant-offset rounded-md transition-all duration-200">
                Pricing
              </a>
            </nav>
          </div>

          {/* Right Section CTAs */}
          <div className="hidden lg:flex items-center space-x-4 flex-shrink-0">
            
            {/* Theme Picker Dropdown */}
            <div className="relative flex-shrink-0" ref={pickerRef}>
                <button
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="flex items-center space-x-1.5 p-2 text-text-secondary-muted hover:text-accent rounded-lg hover:bg-dominant-offset cursor-pointer transition-all duration-200"
                  title="Choose Color Theme"
                >
                  <Palette className="w-5 h-5" />
                  <span className="text-xs font-semibold hidden xl:inline">
                    {THEMES.find(t => t.id === theme)?.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

              {/* Theme Picker Floating Menu */}
              {showThemePicker && (
                <div className="absolute right-0 mt-2 w-56 bg-card-secondary border border-border-secondary rounded-xl shadow-xl p-2.5 z-50 animate-[fade-in_150ms_ease-out]">
                  <div className="text-[10px] font-bold text-text-secondary-muted px-2 py-1 uppercase tracking-wider">
                    Color Palette
                  </div>
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                      }}
                      className={`w-full flex items-center space-x-2.5 p-2 rounded-lg text-xs font-semibold hover:bg-dominant-offset cursor-pointer text-left transition-all duration-200 border-none bg-transparent ${
                        theme === t.id ? 'text-accent bg-accent-light' : 'text-text-secondary'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${t.colorBg} block border border-white/20`} />
                      <span>{t.name}</span>
                    </button>
                  ))}

                  <div className="text-[10px] font-bold text-text-secondary-muted px-2 py-1 mt-2 uppercase tracking-wider border-t border-border-secondary/40 pt-2">
                    Appearance Mode
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    <button
                      onClick={() => setMode('light')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                        mode === 'light'
                          ? 'border-accent bg-accent-light text-accent'
                          : 'border-border-secondary/40 text-text-secondary-muted hover:bg-dominant-offset'
                      }`}
                    >
                      <Sun className="w-4 h-4 mb-1" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setMode('dark')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                        mode === 'dark'
                          ? 'border-accent bg-accent-light text-accent'
                          : 'border-border-secondary/40 text-text-secondary-muted hover:bg-dominant-offset'
                      }`}
                    >
                      <Moon className="w-4 h-4 mb-1" />
                      <span>Dark</span>
                    </button>
                    <button
                      onClick={() => setMode('system')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                        mode === 'system'
                          ? 'border-accent bg-accent-light text-accent'
                          : 'border-border-secondary/40 text-text-secondary-muted hover:bg-dominant-offset'
                      }`}
                    >
                      <Monitor className="w-4 h-4 mb-1" />
                      <span>System</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mode Toggle Button */}
            <button 
              onClick={toggleMode}
              className="p-2 text-text-secondary-muted hover:text-accent rounded-full hover:bg-dominant-offset cursor-pointer transition-all duration-200 touch-target"
              title={resolvedMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {resolvedMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Search Icon */}
            <button className="p-2 text-text-secondary-muted hover:text-accent rounded-full hover:bg-dominant-offset cursor-pointer transition-all duration-200 touch-target">
              <Search className="w-5 h-5" />
            </button>
          
            <button 
              onClick={() => onNavigate('login')} 
              className="px-3 py-2 text-[15px] font-medium text-text-secondary-muted hover:text-accent hover:bg-dominant-offset rounded-md cursor-pointer whitespace-nowrap border-none bg-transparent transition-all duration-200 touch-target"
            >
              Sign in
            </button>
          
            <button 
              onClick={() => onNavigate('signup')} 
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md font-semibold text-[15px] shadow-sm cursor-pointer block whitespace-nowrap border-none transition-all duration-200 touch-target"
            >
              Get it free
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-1.5">
            {/* Theme Toggle (Mobile) */}
            <button 
              onClick={() => {
                const nextIdx = (THEMES.findIndex(t => t.id === theme) + 1) % THEMES.length;
                setTheme(THEMES[nextIdx].id);
              }}
              className="p-2 text-text-secondary-muted hover:text-accent rounded-md hover:bg-dominant-offset cursor-pointer touch-target"
              title="Change Theme Palette"
            >
              <Palette className="w-5 h-5" />
            </button>
            {/* Mode Toggle (Mobile) */}
            <button 
              onClick={toggleMode}
              className="p-2 text-text-secondary-muted hover:text-accent rounded-md hover:bg-dominant-offset cursor-pointer touch-target"
              title="Toggle Mode"
            >
              {resolvedMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 text-text-secondary-muted hover:text-accent rounded-md hover:bg-dominant-offset touch-target">
              <Search className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="p-2 text-text-secondary-muted hover:text-accent rounded-md hover:bg-dominant-offset touch-target"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <div 
        className={`fixed inset-0 top-[60px] bg-[#070b13]/40 z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Menu Panel */}
      <div className={`fixed top-[60px] right-0 w-full max-w-sm h-[calc(100dvh-60px)] bg-dominant shadow-xl z-40 border-l border-border-secondary transition-transform duration-300 transform lg:hidden flex flex-col justify-between ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="overflow-y-auto px-6 py-6 space-y-6 flex-1">
          {navLinks.map((link, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-xs font-semibold text-text-secondary-muted uppercase tracking-wider">
                {link.name}
              </h3>
              <div className="grid gap-3 pl-2 border-l-2 border-border-secondary">
                {link.items.map((item, itemIdx) => (
                  <a key={itemIdx} href="#" className="block py-1">
                    <span className="text-sm font-medium text-text-secondary hover:text-accent block">
                      {item.title}
                    </span>
                    <span className="text-xs text-text-secondary-muted block mt-0.5 line-clamp-1">
                      {item.desc}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-2">
            <a href="#" className="block text-sm font-medium text-text-secondary hover:text-accent py-2">
              Pricing
            </a>
          </div>
        </div>

        <div className="p-6 border-t border-border-secondary bg-dominant-offset space-y-3 flex-shrink-0">
          <button 
            onClick={() => { setIsOpen(false); onNavigate('login'); }}
            className="block text-center w-full py-2.5 font-medium text-text-secondary hover:text-accent border border-border-secondary hover:border-accent rounded cursor-pointer bg-transparent"
          >
            Sign in
          </button>
          <button 
            onClick={() => { setIsOpen(false); onNavigate('signup'); }}
            className="block text-center w-full py-2.5 font-semibold text-white bg-accent hover:bg-accent-hover rounded shadow cursor-pointer border-none"
          >
            Get it free
          </button>
        </div>
      </div>
    </header>
  );
}
