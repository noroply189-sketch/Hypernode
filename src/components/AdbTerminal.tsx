import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  Copy,
  Check,
  Filter,
  Search,
  Sparkles,
} from 'lucide-react';
import { AndroidDeviceNode, LogEntry } from '../types';

interface AdbTerminalProps {
  device: AndroidDeviceNode;
  onExecuteShell: (cmd: string) => Promise<{ success: boolean; output: string }>;
}

export const AdbTerminal: React.FC<AdbTerminalProps> = ({ device, onExecuteShell }) => {
  const [activeTab, setActiveTab] = useState<'shell' | 'logcat'>('shell');
  const [shellInput, setShellInput] = useState('');
  const [shellHistory, setShellHistory] = useState<Array<{ cmd: string; output: string; time: string }>>([
    {
      cmd: 'getprop ro.build.version.release',
      output: '13',
      time: new Date().toLocaleTimeString(),
    },
    {
      cmd: 'dumpsys battery',
      output: 'Current Battery Service state:\n  AC powered: true\n  status: 2 (Charging)\n  level: 100\n  temperature: 285 (28.5 C)',
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const [logFilterLevel, setLogFilterLevel] = useState<'ALL' | 'I' | 'W' | 'E'>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [shellHistory]);

  const handleRunCommand = async (commandToRun: string) => {
    const cmd = commandToRun.trim();
    if (!cmd) return;

    setIsExecuting(true);
    try {
      const res = await onExecuteShell(cmd);
      setShellHistory((prev) => [
        ...prev,
        {
          cmd,
          output: res.output || '(No output returned)',
          time: new Date().toLocaleTimeString(),
        },
      ]);
      setShellInput('');
    } catch (err: any) {
      setShellHistory((prev) => [
        ...prev,
        {
          cmd,
          output: `[Error]: ${err.message}`,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyLogs = () => {
    const text =
      activeTab === 'shell'
        ? shellHistory.map((h) => `$ adb shell ${h.cmd}\n${h.output}`).join('\n\n')
        : device.recentLogs
            .map((l) => `${l.timestamp} [${l.level}] ${l.tag}: ${l.message}`)
            .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = device.recentLogs.filter((log) => {
    if (logFilterLevel !== 'ALL' && log.level !== logFilterLevel) return false;
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      return log.tag.toLowerCase().includes(q) || log.message.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Console Header & Tabs */}
      <div className="p-4 rounded-2xl bg-[#0d1322] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('shell')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'shell'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Interactive ADB Shell</span>
          </button>

          <button
            onClick={() => setActiveTab('logcat')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'logcat'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Logcat Stream ({device.recentLogs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'logcat' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter tag or message..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono w-48"
                />
              </div>

              <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-0.5 text-xs font-mono">
                {(['ALL', 'I', 'W', 'E'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setLogFilterLevel(level)}
                    className={`px-2 py-0.5 rounded ${
                      logFilterLevel === level
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Window */}
      <div className="rounded-2xl bg-black border border-slate-800 p-4 font-mono text-xs shadow-2xl min-h-[440px] max-h-[560px] flex flex-col justify-between overflow-hidden">
        {activeTab === 'shell' ? (
          <>
            {/* Command History View */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="text-slate-500 text-[11px] border-b border-slate-900 pb-2">
                ALFRIANCLOUD Android Debug Bridge (ADB) Terminal Subsystem
                <br />
                Connected endpoint: {device.host}:{device.port} · Device Model: {device.deviceModel}
              </div>

              {shellHistory.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <span className="text-slate-600">[{item.time}]</span>
                    <span className="text-emerald-400 font-bold">$</span>
                    <span>adb shell {item.cmd}</span>
                  </div>
                  <pre className="text-slate-300 pl-4 whitespace-pre-wrap leading-relaxed text-[11px] font-mono">
                    {item.output}
                  </pre>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Quick Preset Buttons */}
            <div className="pt-3 border-t border-slate-900 flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-[10px] text-slate-500 font-sans mr-1">Presets:</span>
              {[
                { label: 'getprop', cmd: 'getprop' },
                { label: 'dumpsys battery', cmd: 'dumpsys battery' },
                { label: 'dumpsys meminfo', cmd: 'dumpsys meminfo' },
                { label: 'df -h', cmd: 'df -h' },
                { label: 'pm list packages', cmd: 'pm list packages -3' },
                { label: 'uptime', cmd: 'uptime' },
              ].map((p) => (
                <button
                  key={p.cmd}
                  onClick={() => handleRunCommand(p.cmd)}
                  disabled={isExecuting}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] border border-slate-800 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Command Input Prompt */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunCommand(shellInput);
              }}
              className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800"
            >
              <span className="text-emerald-400 font-bold">$ adb shell</span>
              <input
                type="text"
                value={shellInput}
                onChange={(e) => setShellInput(e.target.value)}
                placeholder="Type adb shell command (e.g. getprop, pm list packages)..."
                disabled={isExecuting}
                className="flex-1 bg-transparent text-white placeholder-slate-600 focus:outline-none text-xs font-mono"
              />
              <button
                type="submit"
                disabled={isExecuting || !shellInput.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-sans transition-colors flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                <span>Run</span>
              </button>
            </form>
          </>
        ) : (
          /* Logcat View */
          <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-2">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-600 text-center py-10 font-sans">
                No logs match the current filter criteria.
              </div>
            ) : (
              filteredLogs.map((log, index) => {
                const color =
                  log.level === 'E'
                    ? 'text-rose-400'
                    : log.level === 'W'
                    ? 'text-amber-400'
                    : log.level === 'I'
                    ? 'text-cyan-400'
                    : 'text-slate-400';

                return (
                  <div key={index} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-600 text-[10px] flex-shrink-0">
                      {log.timestamp.split('T')[1]?.substring(0, 8)}
                    </span>
                    <span className={`px-1 rounded text-[10px] font-bold flex-shrink-0 ${color}`}>
                      [{log.level}]
                    </span>
                    <span className="text-slate-400 font-semibold flex-shrink-0">
                      {log.tag}:
                    </span>
                    <span className="text-slate-200 break-all">{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
