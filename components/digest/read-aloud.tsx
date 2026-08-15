'use client';

/**
 * 朗读卡片 · 浏览器原生 SpeechSynthesis(零成本 · 通勤听)
 * 把 TL;DR + 六维拼成一段中文朗读,点一下就能听。
 * 不支持语音合成的浏览器自动隐藏按钮。
 */
import { useEffect, useRef, useState } from 'react';
import { Volume2, Square, Loader2 } from 'lucide-react';

export function ReadAloud({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => { try { window.speechSynthesis?.cancel(); } catch {} };
  }, []);

  if (!supported) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 1.05;
    // 优先挑中文语音
    const zh = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('zh'));
    if (zh) u.voice = zh;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    uttRef.current = u;
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-ink rounded-full text-sm font-bold bg-white hover:bg-bg-alt transition"
      aria-label={speaking ? '停止朗读' : '朗读这条资讯'}
    >
      {speaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
      {speaking ? '停止' : '朗读'}
    </button>
  );
}
