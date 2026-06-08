import { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, FileText, Clock, X, ChevronRight } from 'lucide-react';

const templates = {
  leave: {
    label: 'Leave Reasons',
    icon: Clock,
    items: [
      'Family function / personal commitment',
      'Not feeling well, need rest',
      'Medical appointment scheduled',
      'Personal emergency at home',
      'Child\'s school event / parent-teacher meeting',
      'Moving to a new house',
      'Attending a wedding ceremony',
      'Need mental health break',
    ],
  },
  message: {
    label: 'Quick Replies',
    icon: MessageSquare,
    items: [
      'Thank you! Noted.',
      'Will get back to you shortly.',
      'Sure, I\'ll take care of it.',
      'Can we discuss this in a call?',
      'Great work! Well done.',
      'I need more time on this. Will update by EOD.',
      'Please check and let me know your thoughts.',
      'Acknowledged. Will start working on it.',
      'Sorry, I missed this. Looking into it now.',
      'Happy to help! Let me know if you need anything else.',
    ],
  },
  task: {
    label: 'Task Updates',
    icon: FileText,
    items: [
      'Completed and tested successfully',
      'In progress — 50% done, on track',
      'Blocked — waiting for API access',
      'Need clarification on requirements',
      'Code review done, ready for merge',
      'Started working on it, will update soon',
      'Deployed to staging for testing',
      'Bug found during testing, investigating',
    ],
  },
  standup: {
    label: 'Daily Progress',
    icon: Sparkles,
    items: [
      'Worked on assigned tasks and completed reviews',
      'Fixed reported bugs and deployed patches',
      'Attended team meetings and sprint planning',
      'Researching best approach for the new feature',
      'Code review and helping team with blockers',
      'Documentation and testing',
      'No blockers, everything on track',
      'Blocked on dependency from backend team',
    ],
  },
  expense: {
    label: 'Expense Descriptions',
    icon: FileText,
    items: [
      'Travel to client office for meeting',
      'Team lunch / dinner',
      'Office supplies — stationery and accessories',
      'Software subscription renewal',
      'Cab / transport for office work',
      'Internet recharge for work from home',
      'Course / certification fee',
    ],
  },
  ticket: {
    label: 'Ticket Descriptions',
    icon: FileText,
    items: [
      'WiFi not working on my floor',
      'Need access to shared drive / folder',
      'Laptop running slow, needs upgrade',
      'Monitor / keyboard / mouse not working',
      'Need software installation — ',
      'Email / account access issue',
      'Printer not connecting',
      'AC / lighting issue in workspace',
    ],
  },
  professional: {
    label: 'Make Professional',
    icon: Sparkles,
    items: [
      'I would like to request your approval on this matter.',
      'Please find the details below for your reference.',
      'Kindly review and share your feedback at the earliest.',
      'I hope this message finds you well.',
      'Thank you for your time and consideration.',
      'Looking forward to your response.',
      'Please let me know if you need any further information.',
      'I appreciate your prompt attention to this.',
    ],
  },
};

const WriteAssist = ({ onSelect, context = 'message', position, onClose }) => {
  const [activeCategory, setActiveCategory] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Pick relevant categories based on context
  const getCategories = () => {
    const contextMap = {
      leave: ['leave', 'professional'],
      message: ['message', 'professional'],
      task: ['task', 'professional'],
      standup: ['standup'],
      expense: ['expense'],
      ticket: ['ticket'],
      general: ['message', 'professional'],
    };
    return (contextMap[context] || contextMap.general).map(key => ({
      key,
      ...templates[key],
    }));
  };

  const categories = getCategories();

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-72 overflow-hidden animate-in"
      style={{
        top: Math.min(position.y, window.innerHeight - 350),
        left: Math.min(position.x, window.innerWidth - 300),
      }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">Write Assist</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/20 rounded p-0.5 transition">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!activeCategory ? (
        <div className="py-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <cat.icon className="w-4 h-4 text-indigo-500" />
                <span>{cat.label}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setActiveCategory(null)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
          >
            ← Back to categories
          </button>
          <div className="max-h-56 overflow-y-auto py-1">
            {activeCategory.items.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WriteAssist;
