import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

const emojiCategories = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😜', '🤗', '🤔', '😏', '😎', '🥳', '😤', '😢', '😭', '😱', '🤯', '😴', '🤮', '🤧', '😷'],
  'Gestures': ['👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '✌️', '🤞', '👌', '👋', '✋', '🤟', '🫡', '🫶', '☝️', '👆', '👇', '👈', '👉'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💗', '💓', '💞', '💘', '💝', '❣️', '💔', '🫀'],
  'Objects': ['🎉', '🎊', '🎈', '🏆', '🥇', '⭐', '🌟', '✨', '💡', '🔥', '💯', '✅', '❌', '⚠️', '📌', '📎', '📝', '📅', '💰', '📧', '🔔', '⏰', '☕', '🍕', '🎂'],
  'Work': ['💻', '📱', '🖥️', '⌨️', '🖨️', '📊', '📈', '📉', '🗂️', '📁', '📋', '🗓️', '✏️', '🔍', '🔧', '⚙️', '🚀', '🎯', '🏢', '🏠'],
};

const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

const EmojiPicker = ({ onSelect, onClose, position, mode = 'full' }) => {
  const [activeTab, setActiveTab] = useState(Object.keys(emojiCategories)[0]);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (mode === 'reaction') {
    return (
      <div
        ref={ref}
        className="fixed z-[100] bg-white dark:bg-slate-800 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 px-2 py-1.5 flex gap-0.5 animate-in"
        style={{
          top: position.y - 50,
          left: Math.min(position.x - 100, window.innerWidth - 280),
        }}
      >
        {reactionEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-lg transition-transform hover:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-72 overflow-hidden animate-in"
      style={{
        bottom: window.innerHeight - position.y + 10,
        left: Math.min(position.x, window.innerWidth - 300),
      }}
    >
      {/* Category tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 px-1 py-1 gap-0.5 overflow-x-auto">
        {Object.keys(emojiCategories).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeTab === cat
                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 max-h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {emojiCategories[activeTab].map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); onClose(); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-lg transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export { EmojiPicker, reactionEmojis };
export default EmojiPicker;
