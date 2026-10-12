import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Bot,
  Sparkles,
  Send,
  RefreshCw,
  FileText,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const AIAssistantView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'summary'>('chat');
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [conversation, setConversation] = useState<
    { role: 'user' | 'assistant'; text: string; time: string }[]
  >([
    {
      role: 'assistant',
      text: `Hello! I am your Raw Material Operational Intelligence Assistant.\n\nI am grounded 100% in your authoritative factory database. Ask me any question regarding planned dates, overdue balances, supplier performance, remarks history, or pending PPIC approvals.\n\n*Note: In accordance with manufacturing compliance, I am an advisory assistant and cannot modify official planning or receipt records.*`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [dailySummary, setDailySummary] = useState<string>('');
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const quickPrompts = [
    'Which RM is overdue today?',
    'Show all materials arriving tomorrow.',
    'Which materials are partially received?',
    'How much RM is yet to arrive in total?',
    'Which RM has the highest pending quantity?',
    'Which Arrival Requests are waiting for PPIC approval?',
    'Summarize today\'s RM situation.',
    'Why is RM 12000035 overdue and what is its history?',
  ];

  const handleSend = async (qText?: string) => {
    const query = qText || question;
    if (!query.trim() || isAsking) return;

    const userMsg = {
      role: 'user' as const,
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConversation((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsAsking(true);

    try {
      const res = await api.askAI(query);
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error connecting to AI service: ${err.message || 'Service unavailable'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const loadDailySummary = async () => {
    setIsLoadingSummary(true);
    try {
      const res = await api.getAIDailySummary();
      setDailySummary(res.summary);
      setSummaryGeneratedAt(res.generatedAt);
    } catch (err: any) {
      setDailySummary(`Failed to generate operational summary: ${err.message}`);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'summary' && !dailySummary) {
      loadDailySummary();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>Operational AI Assistant (Gemini)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Natural language interrogation of raw material schedules, gate arrivals, and risk observations.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'chat'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Interactive Query
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'summary'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Daily Briefing
          </button>
        </div>
      </div>

      {activeTab === 'chat' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Chat Stream (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col h-[650px] overflow-hidden">
            {/* Chat header */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-slate-800">
                  Authoritative Operational Model Active
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Model: gemini-3.8-flash
              </span>
            </div>

            {/* Messages stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {conversation.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-800 border border-slate-200 font-sans'
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div
                      className={`text-[10px] mt-2 text-right ${
                        msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}

              {isAsking && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Analyzing live RM database records...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about materials, dates, overdue balances, approvals..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isAsking || !question.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Suggested Industrial Queries & Guardrails */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Frequent Questions</span>
              </h3>
              <div className="space-y-1.5">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p)}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 text-[11px] text-slate-700 hover:text-indigo-900 font-medium transition-colors border border-slate-100 flex items-center justify-between group"
                  >
                    <span className="line-clamp-2">{p}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Strict AI Boundaries (Section 69) */}
            <div className="bg-indigo-50/50 rounded-xl border border-indigo-200 p-4 text-xs space-y-2">
              <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>AI Permission Boundaries</span>
              </h4>
              <p className="text-[11px] text-indigo-900 leading-relaxed">
                Gemini AI is strictly advisory. It cannot alter planned dates, adjust received quantities, approve arrivals, or delete records.
              </p>
              <div className="text-[10px] text-indigo-700 font-semibold">
                Rule: "If data is unavailable, it explicitly states: No matching record found."
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Daily Briefing Tab */
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI Daily Operational Executive Summary
              </h2>
              {summaryGeneratedAt && (
                <span className="text-xs text-slate-400">
                  Generated: {new Date(summaryGeneratedAt).toLocaleString()}
                </span>
              )}
            </div>
            <button
              onClick={loadDailySummary}
              disabled={isLoadingSummary}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? 'animate-spin' : ''}`} />
              <span>Refresh Summary</span>
            </button>
          </div>

          {isLoadingSummary ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Synthesizing today's material arrivals, overdue risks, and approval backlogs...</span>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
              {dailySummary || 'Click "Refresh Summary" to generate today\'s operational brief.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
