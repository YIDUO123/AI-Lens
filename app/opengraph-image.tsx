/**
 * 动态 OpenGraph 图片(1200×630)
 * 分享到微信/微博/Telegram 时会显示这张图
 * 首页级别的品牌图 · 深色底 + 珊瑚 logo + slogan
 */
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AI Lens · 尝试看清 AI 产品的实质';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1a1a1a',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Coral glow background */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,53,0.35), transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,184,77,0.25), transparent 70%)',
          }}
        />

        {/* 顶部 logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #FF6B35 0%, #FFB84D 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
              transform: 'rotate(-6deg)',
              fontSize: '38px',
              fontWeight: 900,
              fontStyle: 'italic',
              fontFamily: 'Georgia, serif',
              color: 'white',
            }}
          >
            ∞
          </div>
          <div style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-1px' }}>AI Lens</div>
        </div>

        {/* 主标题 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative' }}>
          <div
            style={{
              fontSize: '30px',
              color: '#FF6B35',
              fontWeight: 900,
              letterSpacing: '4px',
              textTransform: 'uppercase',
            }}
          >
            尝试看清 AI 产品的实质
          </div>
          <div
            style={{
              fontSize: '104px',
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: '-4px',
              display: 'flex',
              gap: '20px',
            }}
          >
            <span>看得</span>
            <span style={{ color: '#2F6FEB', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>多</span>
            <span>· 不如看得</span>
            <span style={{ color: '#FF6B35', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>懂</span>
          </div>
        </div>

        {/* 底部 stats */}
        <div style={{ display: 'flex', gap: '40px', position: 'relative' }}>
          <StatBox num="200+" label="AI 动态 / 天" />
          <StatBox num="22" label="模型实时对比" />
          <StatBox num="28" label="家族代际史" />
          <StatBox num="PM" label="视角深度洞察" />
        </div>
      </div>
    ),
    { ...size },
  );
}

function StatBox({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '48px', fontWeight: 900, color: '#FF6B35', fontFamily: 'Georgia, serif' }}>
        {num}
      </div>
      <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)' }}>{label}</div>
    </div>
  );
}
