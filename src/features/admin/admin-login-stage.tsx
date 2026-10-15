'use client'

import { useState } from 'react'
import styles from '@/features/admin/admin.module.css'

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
    <section aria-label="检校门禁" className={styles.loginStage}>
      <div aria-hidden="true" className={styles.loginDeskSurface} />

      <div
        className={`${styles.dossierBook} ${allReady ? styles.dossierBookReady : ''}`}
        data-login-ready={allReady}
      >
        <div aria-hidden="true" className={styles.loginBackSheetOne} />
        <div aria-hidden="true" className={styles.loginBackSheetTwo} />

        {/* 左翼：3D 布面封套、三钥仪轨与活字印盘 */}
        <div aria-hidden="true" className={styles.dossierCover}>
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
        </div>

        {/* 中缝立体朱砂封锁栓 */}
        <div
          aria-hidden="true"
          className={`${styles.centerLatch} ${allReady ? styles.centerLatchOpen : ''}`}
        >
          <span>{allReady ? '启' : '封'}</span>
        </div>

        {/* 右翼：宣纸检校通牒表单页 */}
        <div className={styles.dossierSheet}>
          <div className={styles.sheetHeader}>
            <div>
              <p className={styles.kicker}>ARCHIVE ACCESS</p>
              <h2 className={styles.sheetTitle}>检校通牒</h2>
            </div>
            <span className={styles.sheetSub}>三因子核验</span>
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
                required
                spellCheck={false}
                type="password"
                value={password}
              />
            </label>

            <label className={styles.fieldLabel}>
              <span className={styles.fieldLabelRow}>
                <span>验证码</span>
                <span className={styles.fieldHint}>叁 · 6 位动态口令</span>
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
    </section>
  )
}
