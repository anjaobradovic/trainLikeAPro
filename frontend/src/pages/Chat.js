import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './Chat.css';

const POLL_MS = 4000;

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const messagesEndRef = useRef(null);

  const dashboardPath = user?.role === 'trainer' ? '/trainer' : '/client';
  const activePartner = partners.find((p) => p.conversation_id === activeId) || null;

  const fetchPartners = async () => {
    try {
      const res = await api.get('/chat/conversations/');
      setPartners(res.data);
      if (res.data.length && activeId === null) setActiveId(res.data[0].conversation_id);
    } catch {
      // ignore polling errors
    } finally {
      setLoadingPartners(false);
    }
  };

  const fetchMessages = async (id) => {
    if (!id) return;
    try {
      const res = await api.get(`/chat/conversations/${id}/messages/`);
      setMessages(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPartners();
    const t = setInterval(fetchPartners, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId);
    const t = setInterval(() => fetchMessages(activeId), POLL_MS);
    return () => clearInterval(t);
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/chat/conversations/${activeId}/messages/`, { content });
      setMessages((prev) => [...prev, res.data]);
      setDraft('');
      fetchPartners();
    } catch (err) {
      // optionally show toast
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="chat-shell">
      <nav className="chat-nav">
        <Link to={dashboardPath} className="logo">
          <span className="logo-icon">LP</span>
          <span className="logo-text">LikeAPro</span>
        </Link>
        <div className="chat-nav-actions">
          <Link to={dashboardPath} className="chat-link">Dashboard</Link>
          <button onClick={handleLogout} className="chat-link">Logout</button>
        </div>
      </nav>

      <div className="chat-body">
        <aside className="chat-sidebar">
          <div className="chat-sidebar-title">
            {user?.role === 'trainer' ? 'Clients' : 'Trainer'}
          </div>
          {loadingPartners ? (
            <div style={{ padding: '1rem 1.4rem', color: '#666' }}>Loading...</div>
          ) : partners.length === 0 ? (
            <div style={{ padding: '1rem 1.4rem', color: '#666', fontSize: '0.85rem' }}>
              {user?.role === 'trainer'
                ? 'No clients assigned to you yet.'
                : 'You have not been matched with a trainer yet.'}
            </div>
          ) : (
            partners.map((p) => (
              <button
                key={p.conversation_id}
                className={`chat-partner ${p.conversation_id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(p.conversation_id)}
              >
                <div className="chat-partner-name">
                  <span>
                    {p.first_name || p.last_name
                      ? `${p.first_name} ${p.last_name}`.trim()
                      : p.username}
                  </span>
                  {p.unread_count > 0 && p.conversation_id !== activeId && (
                    <span className="chat-unread">{p.unread_count}</span>
                  )}
                </div>
                {p.last_message && (
                  <div className="chat-partner-preview">{p.last_message}</div>
                )}
              </button>
            ))
          )}
        </aside>

        <section className="chat-thread">
          {!activePartner ? (
            <div className="chat-empty">Select a conversation to start chatting</div>
          ) : (
            <>
              <div className="chat-thread-header">
                {activePartner.first_name || activePartner.last_name
                  ? `${activePartner.first_name} ${activePartner.last_name}`.trim()
                  : activePartner.username}
              </div>
              <div className="chat-messages">
                {messages.map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.is_mine ? 'mine' : ''}`}>
                    {m.content}
                    <span className="chat-bubble-time">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form className="chat-form" onSubmit={handleSend}>
                <textarea
                  className="chat-input"
                  rows={2}
                  placeholder="Write a message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  maxLength={2000}
                />
                <button type="submit" className="chat-send" disabled={sending || !draft.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
