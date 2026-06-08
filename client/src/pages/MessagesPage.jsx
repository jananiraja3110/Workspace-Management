import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import {
  Send,
  MessageSquare,
  Search,
  Plus,
  ArrowLeft,
  Check,
  CheckCheck,
  Paperclip,
  FileText,
  Image,
  X,
  Smile,
  Sparkles,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import WriteAssist from '../components/common/WriteAssist';
import EmojiPicker from '../components/common/EmojiPicker';

const MessagesPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showChat, setShowChat] = useState(false); // mobile toggle
  const [attachedFile, setAttachedFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showWriteAssist, setShowWriteAssist] = useState(false);
  const [reactionPicker, setReactionPicker] = useState(null); // { msgId, x, y }
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const writeAssistRef = useRef(null);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const fetchConversations = async () => {
    try {
      const { data } = await API.get('/messages/conversations');
      setConversations(data.conversations || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoadingConvos(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      setLoadingMessages(true);
      const { data } = await API.get(`/messages/with/${userId}`);
      setMessages(data.messages || data);
      // Mark as read
      API.put(`/messages/read/${userId}`).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await API.get('/users');
      setUsers(data.users || data);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchUsers();
  }, []);

  // Poll for new messages
  useEffect(() => {
    if (selectedUser) {
      pollRef.current = setInterval(() => {
        API.get(`/messages/with/${selectedUser._id || selectedUser}`)
          .then(({ data }) => setMessages(data.messages || data))
          .catch(() => {});
        fetchConversations();
      }, 10000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedUser]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (convo) => {
    const otherUser = convo.user || convo.participant || convo;
    setSelectedUser(otherUser);
    setShowChat(true);
    fetchMessages(otherUser._id || otherUser);
  };

  const startNewConversation = (u) => {
    setSelectedUser(u);
    setMessages([]);
    setShowChat(true);
    setShowNewChat(false);
    fetchMessages(u._id);
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !attachedFile) || !selectedUser) return;
    const recipientId = selectedUser._id || selectedUser;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('receiver', recipientId);
      if (messageText.trim()) formData.append('content', messageText);
      if (attachedFile) formData.append('file', attachedFile);

      await API.post('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessageText('');
      setAttachedFile(null);
      fetchMessages(recipientId);
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (msgId, emoji) => {
    try {
      const { data } = await API.post(`/messages/${msgId}/react`, { emoji });
      setMessages((prev) =>
        prev.map((m) => (m._id === msgId ? { ...m, reactions: data.reactions } : m))
      );
    } catch {
      toast.error('Failed to react');
    }
    setReactionPicker(null);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowWriteAssist(true);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd');
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'h:mm a');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getName = (u) => u?.name || u?.firstName || u?.email || 'User';

  const filteredConvos = conversations.filter((c) => {
    if (!search) return true;
    const name = getName(c.user || c.participant);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredUsers = users.filter((u) => {
    if (u._id === user?._id) return false;
    if (!userSearch) return true;
    const name = getName(u);
    return name.toLowerCase().includes(userSearch.toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Messages</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Chat with your team</p>
        </div>
        <Button onClick={() => setShowNewChat(true)} size="sm">
          <Plus className="h-4 w-4" /> New Chat
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {/* Left panel - Conversation list */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col ${
            showChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvos ? (
              <LoadingSpinner size="sm" />
            ) : filteredConvos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                <MessageSquare className="h-8 w-8 mb-2" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat</p>
              </div>
            ) : (
              filteredConvos.map((convo) => {
                const other = convo.user || convo.participant || convo;
                const isActive =
                  (selectedUser?._id || selectedUser) === (other._id || other);
                return (
                  <button
                    key={other._id || other}
                    onClick={() => selectConversation(convo)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700 ${
                      isActive ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                      {getInitials(getName(other))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {getName(other)}
                        </span>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {formatTime(convo.lastMessage?.createdAt || convo.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {convo.lastMessage?.fileName ? `📎 ${convo.lastMessage.fileName}` : convo.lastMessage?.content || 'Start a conversation'}
                        </p>
                        {convo.unreadCount > 0 && (
                          <span className="flex-shrink-0 ml-2 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-indigo-600 px-1.5 text-xs font-medium text-white">
                            {convo.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel - Chat view */}
        <div
          className={`flex-1 flex flex-col ${
            !showChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <MessageSquare className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-600" />
              <h3 className="text-lg font-medium text-slate-500 dark:text-slate-400">
                Select a conversation
              </h3>
              <p className="text-sm mt-1">
                Choose a conversation or start a new one
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <button
                  onClick={() => {
                    setShowChat(false);
                    setSelectedUser(null);
                  }}
                  className="md:hidden p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                  {getInitials(getName(selectedUser))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {getName(selectedUser)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedUser.role || 'Team member'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-700/50">
                {loadingMessages ? (
                  <LoadingSpinner size="sm" />
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine =
                      (msg.sender?._id || msg.sender) === user?._id;
                    const reactions = msg.reactions || [];
                    // Group reactions by emoji
                    const groupedReactions = reactions.reduce((acc, r) => {
                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                      return acc;
                    }, {});
                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
                      >
                        <div className="relative max-w-[70%]">
                          {/* Reaction button - shows on hover */}
                          <button
                            onClick={(e) => setReactionPicker({ msgId: msg._id, x: e.clientX, y: e.clientY })}
                            className={`absolute top-1/2 -translate-y-1/2 ${isMine ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600`}
                            title="React"
                          >
                            <Smile className="w-4 h-4 text-slate-400" />
                          </button>

                          <div
                            className={`rounded-2xl px-4 py-2.5 ${
                              isMine
                                ? 'bg-indigo-600 text-white rounded-br-md'
                                : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-600 rounded-bl-md'
                            }`}
                          >
                            {msg.fileName && (
                              <a
                                href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/${msg.filePath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 mb-1 px-3 py-2 rounded-lg text-xs font-medium ${
                                  isMine ? 'bg-indigo-500/30 hover:bg-indigo-500/40' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-500'
                                } transition-colors`}
                              >
                                {msg.fileType?.startsWith('image/') ? (
                                  <Image className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                                <span className="truncate max-w-[180px]">{msg.fileName}</span>
                              </a>
                            )}
                            {msg.content && (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                            )}
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 ${
                                isMine ? 'text-indigo-200' : 'text-slate-400'
                              }`}
                            >
                              <span className="text-xs">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                              {isMine && (
                                msg.read ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )
                              )}
                            </div>
                          </div>

                          {/* Reactions display */}
                          {Object.keys(groupedReactions).length > 0 && (
                            <div className={`flex gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              {Object.entries(groupedReactions).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg._id, emoji)}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/30 shadow-sm transition badge-pop"
                                >
                                  <span>{emoji}</span>
                                  {count > 1 && <span className="text-slate-500 dark:text-slate-400">{count}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                {attachedFile && (
                  <div className="mb-2 flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg text-sm">
                    {attachedFile.type?.startsWith('image/') ? (
                      <Image className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-indigo-500" />
                    )}
                    <span className="flex-1 truncate text-slate-700 dark:text-slate-300">{attachedFile.name}</span>
                    <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files[0]) setAttachedFile(e.target.files[0]);
                      e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Attach file"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button
                    ref={emojiButtonRef}
                    onClick={(e) => {
                      setMenuPos({ x: e.clientX, y: e.clientY });
                      setShowEmojiPicker(!showEmojiPicker);
                      setShowWriteAssist(false);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-yellow-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Emoji"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <button
                    ref={writeAssistRef}
                    onClick={(e) => {
                      setMenuPos({ x: e.clientX, y: e.clientY });
                      setShowWriteAssist(!showWriteAssist);
                      setShowEmojiPicker(false);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Write Assist"
                  >
                    <Sparkles className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    placeholder="Type a message... (right-click for templates)"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onContextMenu={handleContextMenu}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <Button
                    onClick={handleSend}
                    loading={sending}
                    disabled={!messageText.trim() && !attachedFile}
                    className="rounded-xl"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <EmojiPicker
                  position={menuPos}
                  onSelect={(emoji) => setMessageText((prev) => prev + emoji)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}

              {/* Write Assist */}
              {showWriteAssist && (
                <WriteAssist
                  position={menuPos}
                  context="message"
                  onSelect={(text) => setMessageText(text)}
                  onClose={() => setShowWriteAssist(false)}
                />
              )}

              {/* Reaction Picker */}
              {reactionPicker && (
                <EmojiPicker
                  position={{ x: reactionPicker.x, y: reactionPicker.y }}
                  mode="reaction"
                  onSelect={(emoji) => handleReaction(reactionPicker.msgId, emoji)}
                  onClose={() => setReactionPicker(null)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      <Modal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        title="New Conversation"
        size="sm"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No users found</p>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u._id}
                  onClick={() => startNewConversation(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors"
                >
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                    {getInitials(getName(u))}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{getName(u)}</p>
                    <p className="text-xs text-slate-400 capitalize">{u.role || 'developer'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MessagesPage;
