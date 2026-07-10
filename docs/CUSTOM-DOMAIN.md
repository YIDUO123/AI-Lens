# 🌐 自定义域名接入指南

> 有钱买域名后回来看这个文档 · 5 分钟绑好。

---

## 第一步 · 买域名

**推荐渠道(按性价比排序):**

| 渠道 | 优点 | 缺点 | 价格参考 |
|------|------|------|---------|
| **Cloudflare Registrar** | 成本价 · DNS 一站式 · 免续费涨价 | 需先有 CF 账号 | `.com` ¥60/年 · `.cn` ¥60/年 |
| **Namecheap** | 首年便宜 · 界面友好 | 续费涨价 | `.com` 首年 ~¥50 · 次年 ~¥100 |
| **阿里云** | 支付宝付款 · 中文界面 | 需实名 · `.cn` 域名要备案 | `.com` ¥55/年 · `.cn` ¥29 首年 |
| **腾讯云 DNSPod** | 中国区解析快 · 支付宝 | `.cn` 需备案 | 差不多价 |

**建议**:买 `.com` 或 `.io` 或 `.dev` — 免备案 · 最省事。
`.cn` 或 `.com.cn` 便宜但要走工信部备案 · 15-20 天流程。

**域名建议:**
- `ailens.io`
- `ailens.co`
- `ailens.dev`
- `ai-lens.com`
- `filter.ai`(如果没被抢)

---

## 第二步 · 加到 Vercel

1. 打开 **https://vercel.com/yiduo123s-projects/ai-lens/settings/domains**
2. 输入你买的域名(不带 `www` 或 `https://`)· 点 **Add**
3. Vercel 会告诉你需要设的 DNS 记录 · 大概长这样:

### 方案 A · 你的域名商 DNS(把 Vercel 当 origin)
在你的域名商后台加两条记录:

```
Type   Name    Value              TTL
A      @       76.76.21.21        Auto
CNAME  www     cname.vercel-dns.com    Auto
```

### 方案 B · 用 Cloudflare 做 DNS(推荐 · 全球最快)
1. Cloudflare 免费加你的域名 · 域名商那边把 NS 指向 CF
2. CF DNS 面板加:
   ```
   Type   Name    Content                     Proxy status
   A      @       76.76.21.21                🌥 DNS only (灰云)
   CNAME  www     cname.vercel-dns.com       🌥 DNS only (灰云)
   ```
   ⚠️ **关键**:必须点成"灰云"(DNS only)· 不能开 Cloudflare 代理(橙云)· 不然会证书打架。

### 方案 C · Vercel 直接接管 DNS(最省事)
在 Vercel 输入你的域名后 · 它会给你 4 个 NS · 直接把域名商的 NS 改成 Vercel 的:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```
以后你所有 DNS 都在 Vercel 面板改 · 一个地方管。

---

## 第三步 · 更新环境变量

DNS 生效后(通常 5-30 分钟 · 最长 24 小时)· Vercel 会自动给你签 Let's Encrypt SSL 证书。

然后:

1. 打开 **https://vercel.com/yiduo123s-projects/ai-lens/settings/environment-variables**
2. 找到 `NEXT_PUBLIC_SITE_URL`(没有的话新增)
3. 值改成 `https://你的新域名.com`
4. GitHub OAuth 也要更新:
   - **https://github.com/settings/developers**
   - 找到 AI Lens 那个 OAuth App
   - **Homepage URL** 和 **Authorization callback URL** 改成新域名
5. **Redeploy**(顶部 Deployments → 最新 ⋯ → Redeploy)

---

## 第四步 · 更新代码里的硬编码 URL

搜代码把旧域名换掉:
```bash
grep -rn "ai-lens-six.vercel.app" app/ components/ .github/ | grep -v node_modules
```

主要文件:
- `.github/workflows/high-freq-fetch.yml`
- `.github/workflows/weekly-newsletter.yml`
- `app/sitemap.ts` · `app/robots.ts` · `app/opengraph-image.tsx`
- 邮件模板里的 unsubscribe link · 通过 `NEXT_PUBLIC_SITE_URL` 变量已经解决

---

## 第五步 · 验证

- [ ] `https://你的域名/` 打开正常 · 无证书警告
- [ ] `https://你的域名/api/health`(或首页)返回 200
- [ ] GitHub OAuth 登录能跳回来
- [ ] Newsletter 邮件里的退订链接指向新域名
- [ ] Google Search Console 加新域名 · 提 sitemap.xml

---

## 备案(仅 `.cn` / `.com.cn` 需要)

如果买了 `.cn` 域名:
1. **不能用 Vercel** · 必须迁到国内云(阿里云/腾讯云)
2. 备案流程 15-20 天 · 要拍照 · 手持身份证
3. 建议直接买 `.com` / `.io` 免这一切

---

## 最小成本组合

**¥60/年 就能拥有:** `xxx.com` (Cloudflare Registrar)  
**¥0/年:** DNS 解析(Cloudflare 免费)  
**¥0/年:** 托管(Vercel Hobby 免费)  
**¥0/年:** SSL 证书(Vercel 自动 Let's Encrypt)  
**¥0/年:** CDN(Vercel 全球边缘)  

**合计:¥60/年就能有个正儿八经的网站** · 比一杯星巴克便宜。

---

绑好域名回来告诉我 · 我帮你跑一遍验证 checklist。
