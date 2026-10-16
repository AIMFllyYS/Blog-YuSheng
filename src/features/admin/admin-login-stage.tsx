'use client'

import { useState } from 'react'
import styles from '@/features/admin/admin.module.css'

const PREVIEW_TOMES = [
  { title: 'AI 与工程实践', count: '长文典籍 · 3D 书脊检校', color: '#365363' },
  { title: '思考与方法论', count: '长文典籍 · 朱砂封存内库', color: '#6b4238' },
  { title: '折晓 AI 早报', count: '螺旋铜圈台历 · 按月归档', color: '#73573b' },
  { title: '器物与技艺', count: 'GitHub API · 线上直写同步', color: '#455947' },
] as const

export function AdminLoginStage({
  error,
  loggingIn,
  onLogin,
}: {
  error: string | undefined
  loggingIn: boolean
  onLogin: (formData: FormData) => Promise<void>
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')

  const step1Ready = username.trim().length > 0
  const step2Ready = password.length > 0
  const cleanCode = code.replace(/\D+/gu, '').slice(0, 6)
  const step3Ready = cleanCode.length === 6
  const allReady = step1Ready && step2Ready && step3Ready

  return (
    <section aria-label="检校门禁" className={styles.loginWorkbench}>
      <div className={styles.loginGrid}>
        {/* 左翼通栏：藏书司三钥规制与 3D 活字印盘 */}
        <aside aria-label="三钥核验规制" className={styles.dossierCover}>
          <div>
            <div className={styles.dossierCoverTop}>
              <div className={styles.verticalPlaque}>藏书司 · 卷藏检校</div>
              <div className={styles.cinnabarSealWrap}>
                <div className={styles.cinnabarSeal}>
                  羽升
                  <br />
                  司印
                </div>
                <span className={styles.sealStateCaption}>
                  {allReady ? '三钥已合 · 可启封' : '待验三钥印信'}
                </span>
              </div>
            </div>

            <ul className={styles.dossierSteps}>
              <li className={styles.dossierStep} data-ready={step1Ready}>
                <span className={styles.dossierStepBadge}>壹</span>
                <div className={styles.dossierStepBody}>
                  <div className={styles.dossierStepTitleRow}>
                    <span className={styles.dossierStepTitle}>掌书名牒</span>
                    <span className={styles.dossierStepStamp}>
                      {step1Ready ? '已录' : '待填'}
                    </span>
                  </div>
                  <p className={styles.dossierStepDesc}>
                    核对藏书司掌书人身份名号（ADMIN_USERNAME）。
                  </p>
                </div>
              </li>

              <li className={styles.dossierStep} data-ready={step2Ready}>
                <span className={styles.dossierStepBadge}>贰</span>
                <div className={styles.dossierStepBody}>
                  <div className={styles.dossierStepTitleRow}>
                    <span className={styles.dossierStepTitle}>内库密令</span>
                    <span className={styles.dossierStepStamp}>
                      {step2Ready ? '已缄' : '待填'}
                    </span>
                  </div>
                  <p className={styles.dossierStepDesc}>
                    验证内库封存口令，防外客误触卷宗（ADMIN_PASSWORD）。
                  </p>
                </div>
              </li>

              <li className={styles.dossierStep} data-ready={step3Ready}>
                <span className={styles.dossierStepBadge}>叁</span>
                <div className={styles.dossierStepBody}>
                  <div className={styles.dossierStepTitleRow}>
                    <span className={styles.dossierStepTitle}>陆位时符</span>
                    <span className={styles.dossierStepStamp}>
                      {step3Ready ? '已合' : `${cleanCode.length}/6`}
                    </span>
                  </div>
                  <p className={styles.dossierStepDesc}>
                    三十秒轮转动态符码（TOTP），落字入盘即刻合印。
                  </p>
                </div>
              </li>
            </ul>

            {/* 3D 活字印盘：随验证码输入实时翻转铜字块 */}
            <div className={styles.movableTypeTray}>
              <div className={styles.movableTypeHeader}>
                <span>时符活字印盘</span>
                <span>TOTP CIPHER TRAY</span>
              </div>
              <div className={styles.movableTypeGrid}>
                {Array.from({ length: 6 }, (_, index) => {
                  const char = cleanCode[index]
                  return (
                    <span
                      className={`${styles.typeBlock} ${char ? styles.typeBlockActive : ''}`}
                      key={index}
                    >
                      <span className={styles.typeBlockFace}>{char ?? '·'}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          <p className={styles.dossierFootnote}>
            印信签发后十二时辰（12h）内有效 · 刷新页面即重新落锁
          </p>
        </aside>

        {/* 中央主案台：宣纸检校通牒表单页 */}
        <div
          className={`${styles.dossierCenterStage} ${allReady ? styles.dossierBookReady : ''}`}
          data-login-ready={allReady}
        >
          <div className={styles.dossierSheet}>
            <div className={styles.loginIdentityBanner}>
              <div>
                <p className={styles.eyebrow}>羽升书房 · 藏书司印</p>
                <h1 className={styles.loginHeroTitle}>可见性</h1>
              </div>
              <div
                aria-hidden="true"
                className={`${styles.centerLatch} ${allReady ? styles.centerLatchOpen : ''}`}
              >
                <span>{allReady ? '启' : '封'}</span>
              </div>
            </div>

            <p className={styles.loginHeroIntro}>
              统管长文卷藏与折晓早报的公开展陈。核验三钥印信后，即可在全屏三栏「总览沙盘」「3D 博客典籍」与「3D 早报台历」案台上实时调阅显隐并直写 GitHub 仓库。
            </p>

            <div className={styles.sheetHeader}>
              <div>
                <p className={styles.kicker}>ARCHIVE ACCESS</p>
                <h2 className={styles.sheetTitle}>检校通牒核验</h2>
              </div>
              <span className={styles.sheetSub}>三因子门禁</span>
            </div>

            {error ? (
              <p className={styles.alertBox} role="alert">
                {error}
              </p>
            ) : null}

            <form
              className={styles.loginForm}
              method="post"
              onSubmit={(event) => {
                event.preventDefault()
                void onLogin(new FormData(event.currentTarget))
              }}
            >
              <div className={styles.loginFieldsGrid}>
                <label className={styles.fieldLabel}>
                  <span className={styles.fieldLabelRow}>
                    <span>用户名</span>
                    <span className={styles.fieldHint}>壹 · 掌书名牒</span>
                  </span>
                  <input
                    autoComplete="username"
                    className={styles.fieldInput}
                    name="username"
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="输入管理员名号"
                    required
                    spellCheck={false}
                    type="text"
                    value={username}
                  />
                </label>

                <label className={styles.fieldLabel}>
                  <span className={styles.fieldLabelRow}>
                    <span>密码</span>
                    <span className={styles.fieldHint}>贰 · 内库密令</span>
                  </span>
                  <input
                    autoComplete="current-password"
                    className={styles.fieldInput}
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="输入内库封存口令"
                    required
                    spellCheck={false}
                    type="password"
                    value={password}
                  />
                </label>
              </div>

              <label className={styles.fieldLabel}>
                <span className={styles.fieldLabelRow}>
                  <span>验证码</span>
                  <span className={styles.fieldHint}>叁 · 6 位动态口令（TOTP）</span>
                </span>
                <input
                  autoComplete="one-time-code"
                  className={`${styles.fieldInput} ${styles.codeInput}`}
                  inputMode="numeric"
                  maxLength={6}
                  name="code"
                  onChange={(event) => setCode(event.target.value)}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  required
                  spellCheck={false}
                  type="text"
                  value={code}
                />
              </label>

              <button className={styles.submitBtn} disabled={loggingIn} type="submit">
                {loggingIn ? '核验印信中…' : '登录'}
              </button>
            </form>
          </div>
        </div>

        {/* 右翼通栏：藏书司立体案台陈列规制预览阁 */}
        <aside aria-label="藏书司案台规制预览" className={styles.loginPreviewRail}>
          <div className={styles.previewRailHeader}>
            <p className={styles.kicker}>WORKBENCH ARCHITECTURE</p>
            <h2 className={styles.previewRailTitle}>三栏立体检校规制</h2>
            <p className={styles.previewRailSub}>
              解锁后自动展开全屏三栏案台：左栏检索分类常驻、中栏顶条固定不随滚动流失、右栏实时督办焦点卷宗与内库封存专匣。
            </p>
          </div>

          {/* 微缩 3D 书脊陈列示意 */}
          <div className={styles.previewMiniShelfCard}>
            <div className={styles.previewMiniHeader}>
              <span>3D 典籍书脊与台历模型</span>
              <span>1:1 呼应全站</span>
            </div>
            <ul className={styles.previewSpineStack}>
              {PREVIEW_TOMES.map((item) => (
                <li
                  className={styles.previewSpineRow}
                  key={item.title}
                  style={{ '--preview-c': item.color } as React.CSSProperties}
                >
                  <span className={styles.previewSpineBar} />
                  <div className={styles.previewSpineInfo}>
                    <strong>{item.title}</strong>
                    <span>{item.count}</span>
                  </div>
                  <span className={styles.previewSpineSeal}>在架</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.previewCapabilityBox}>
            <div className={styles.previewCapItem}>
              <span className={styles.previewCapDot} />
              <div>
                <strong>GitHub 仓库在线直写</strong>
                <p>无需本地运行 pnpm dev，线上切换「显示 / 隐藏」直接提交 content/visibility.json。</p>
              </div>
            </div>
            <div className={styles.previewCapItem}>
              <span className={styles.previewCapDot} />
              <div>
                <strong>三栏锁定 · 独立滚轴</strong>
                <p>顶栏命令条、左栏分类树与右栏封存匣恒定锁定，上下滑动卷宗时操控按钮绝不跑位。</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className={styles.workbenchFooterBar}>
        <span>羽升书房 · 藏书司检校门禁（/admin）</span>
        <span>壹 掌书名牒 · 贰 内库密令 · 叁 陆位时符</span>
        <span>同步目标：content/visibility.json（GitHub Contents API）</span>
      </footer>
    </section>
  )
}
