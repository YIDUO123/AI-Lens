'use client';

/**
 * 每日精编 · 订阅偏好设置卡片
 * 选模块 / 模型 / 发送时间 / 渠道(+ERP 绑定)· 一屏搞定
 * 用在 /me · 登录用户管理自己的每日推送
 */
import { useState, useTransition } from 'react';
import { Loader2, Check, Bell, Send } from 'lucide-react';
import { saveDigestPreferences, testFeishuWebhook } from '@/lib/actions/digest';
import type { DigestPreferences } from '@/db';

const MODULES = [
  { key: 'ai-models', label: '🧠 模型动态' },
  { key: 'ai-products', label: '🚀 产品发布' },
  { key: 'industry', label: '📊 行业观察' },
  { key: 'paper', label: '📄 论文研究' },
  { key: 'tip', label: '💡 实用技巧' },
];
const MODELS = ['claude', 'gpt', 'gemini', 'deepseek', 'qwen', 'llama', 'grok', 'kimi'];
const TIMES = ['07:00', '08:00', '09:00', '12:00', '18:00', '21:00'];
const CHANNELS = [
  { key: 'email', label: '📧 邮件' },
  { key: 'jdme', label: '🔔 京me · 即将开放' },
  { key: 'feishu', label: '🐦 飞书' },
];

export function DigestPreferences({
  initial, initialErp, initialFeishu, initialFeishuWebhook, subscribed,
}: {
  initial: DigestPreferences;
  initialErp: string | null;
  initialFeishu: string | null;
  initialFeishuWebhook: string | null;
  subscribed: boolean;
}) {
  const [modules, setModules] = useState<string[]>(initial.modules || []);
  const [models, setModels] = useState<string[]>(initial.models || []);
  const [sendTime, setSendTime] = useState(initial.sendTime || '09:00');
  const [channels, setChannels] = useState<string[]>(initial.channels || ['email']);
  const [format, setFormat] = useState(initial.format || 'both');
  const [erp, setErp] = useState(initialErp || '');
  const [feishuId, setFeishuId] = useState(initialFeishu || '');
  const [feishuWebhook, setFeishuWebhook] = useState(initialFeishuWebhook || '');
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testOk, setTestOk] = useState(false);

  const testFeishu = async () => {
    setTesting(true); setTestMsg('');
    const r = await testFeishuWebhook(feishuWebhook);
    setTestOk(r.ok);
    setTestMsg(r.ok ? '已发送 · 去飞书群看' : (r.error || '发送失败'));
    setTesting(false);
  };

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = () => {
    setMsg(''); setErr('');
    start(async () => {
      const r = await saveDigestPreferences(
        { modules, models, sendTime, channels: channels as DigestPreferences['channels'], format, frequency: 'daily' },
        { erp, feishuId, feishuWebhook },
      );
      if (r.ok) setMsg(subscribed ? '偏好已更新 ✓' : '订阅成功 · 明天开始每日推送 ✓');
      else setErr(r.error);
    });
  };

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition ${active ? 'border-coral bg-coral text-white' : 'border-ink bg-white hover:bg-bg-alt'}`;

  return (
    <div className="bg-cream border-2 border-ink rounded-2xl p-6 shadow-brutal-sm">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-4 h-4 text-coral" />
        <div className="text-[10px] font-black tracking-[2px] uppercase text-coral">Daily Digest</div>
      </div>
      <h3 className="text-2xl font-black mb-1">每日精编推送</h3>
      <p className="text-sm text-ink-soft mb-5">每天定时给你推 10 条精选 · 六维拆解 · 5 分钟读懂今天的 AI。</p>

      {/* 模块 */}
      <div className="mb-5">
        <div className="text-xs font-black text-ink-soft mb-2">关注模块 <span className="font-normal text-muted-foreground">· 不选=全部</span></div>
        <div className="flex flex-wrap gap-2">
          {MODULES.map((m) => (
            <button key={m.key} type="button" onClick={() => toggle(modules, setModules, m.key)} className={chip(modules.includes(m.key))}>{m.label}</button>
          ))}
        </div>
      </div>

      {/* 模型 */}
      <div className="mb-5">
        <div className="text-xs font-black text-ink-soft mb-2">关注模型 <span className="font-normal text-muted-foreground">· 可选</span></div>
        <div className="flex flex-wrap gap-2">
          {MODELS.map((m) => (
            <button key={m} type="button" onClick={() => toggle(models, setModels, m)} className={chip(models.includes(m))}>{m}</button>
          ))}
        </div>
      </div>

      {/* 时间 */}
      <div className="mb-5">
        <div className="text-xs font-black text-ink-soft mb-2">发送时间 · 北京时间</div>
        <div className="flex flex-wrap gap-2">
          {TIMES.map((t) => (
            <button key={t} type="button" onClick={() => setSendTime(t)} className={chip(sendTime === t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* 渠道 */}
      <div className="mb-5">
        <div className="text-xs font-black text-ink-soft mb-2">推送渠道 · 可多选</div>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button key={c.key} type="button" onClick={() => toggle(channels, setChannels, c.key)} className={chip(channels.includes(c.key))}>{c.label}</button>
          ))}
        </div>
      </div>

      {/* ERP(选了京me 才显示) */}
      {channels.includes('jdme') && (
        <div className="mb-4">
          <label className="text-xs font-black text-ink-soft mb-1.5 block">京me / ERP 账号 <span className="text-coral">*</span></label>
          <input value={erp} onChange={(e) => setErp(e.target.value)} placeholder="如 lizhouyang.750"
            className="w-full px-3 py-2 border-2 border-ink rounded-lg text-sm bg-white focus:outline-none" />
          <div className="text-[11px] text-muted-foreground mt-1.5">京me 推送需内网机器人通道 · 即将开放;当前建议先用邮件 / 飞书。</div>
        </div>
      )}

      {/* 飞书 webhook(选了飞书才显示 · 自助粘贴) */}
      {channels.includes('feishu') && (
        <div className="mb-4">
          <label className="text-xs font-black text-ink-soft mb-1.5 block">飞书群机器人 Webhook <span className="text-coral">*</span></label>
          <input value={feishuWebhook} onChange={(e) => setFeishuWebhook(e.target.value)} placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"
            className="w-full px-3 py-2 border-2 border-ink rounded-lg text-xs bg-white focus:outline-none font-mono" />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={testFeishu}
              disabled={testing || !feishuWebhook}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-ink rounded-lg text-xs font-bold bg-white hover:bg-bg-alt transition disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              发送测试
            </button>
            {testMsg && <span className={`text-xs font-bold ${testOk ? 'text-green-700' : 'text-red-600'}`}>{testMsg}</span>}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
            飞书群 → 设置 → 群机器人 → 添加「自定义机器人」→ 安全设置选「自定义关键词」填 <b className="text-ink">AI Lens</b> → 复制 Webhook 粘到这里,点「发送测试」当场验证。
          </div>
        </div>
      )}

      <button onClick={save} disabled={pending}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-coral text-white border-2 border-ink rounded-lg text-sm font-bold shadow-brutal-sm hover:-translate-y-0.5 transition disabled:opacity-50">
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {subscribed ? '保存偏好' : '开启每日推送'}
      </button>

      {msg && <div className="mt-3 text-sm font-bold text-green-700">{msg}</div>}
      {err && <div className="mt-3 text-sm font-bold text-red-600">⚠️ {err}</div>}
    </div>
  );
}
