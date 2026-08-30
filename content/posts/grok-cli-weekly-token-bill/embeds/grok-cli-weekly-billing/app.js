/* global BILLING */
(function () {
  const B = window.BILLING;
  if (!B) {
    document.body.textContent = "缺少 data.js";
    return;
  }

  const T = B.totals_logged;
  const E = B.estimate_fill;
  const Q = B.quota;
  const USED = T.prompt + T.completion;
  const WEEK = USED / 0.22;
  const MONTH = WEEK * 4;
  const WEEK_FILL = (E.filled_prompt + E.filled_completion) / 0.22;
  const MONTH_FILL = WEEK_FILL * 4;
  const TOP = B.sessions[0];
  const IN_OUT = T.prompt / T.completion;
  const UNC_OUT = T.uncached / T.completion;
  const PER_LOOP_IN = T.prompt / T.inferences_logged;
  const PER_LOOP_OUT = T.completion / T.inferences_logged;
  const USD_PER_M_OUT = T.usd_with_images / (T.completion / 1e6);
  const USD_PER_M_IN = T.usd_with_images / (T.prompt / 1e6);

  const yi = (n) => {
    const x = Number(n) || 0;
    if (Math.abs(x) >= 1e8) return (x / 1e8).toFixed(2) + " 亿";
    if (Math.abs(x) >= 1e4) return (x / 1e4).toFixed(1) + " 万";
    return Math.round(x).toLocaleString("zh-CN");
  };
  const tok = (n) => Math.round(Number(n) || 0).toLocaleString("zh-CN");
  const usd = (n) => "$" + (Number(n) || 0).toFixed(2);
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  document.getElementById("when").textContent =
    B.meta.cycle_start_local.replace("T", " ").slice(0, 16) +
    "  →  " +
    B.meta.cycle_end_local.replace("T", " ").slice(0, 16) +
    "  整点清零";

  document.getElementById("plain").innerHTML =
    "有 tokenizer 账的部分：模型一共<strong>吃进去 " +
    yi(T.prompt) +
    " token</strong>，<strong>吐出 " +
    yi(T.completion) +
    " token</strong>，合计 <strong>" +
    yi(USED) +
    "</strong>。" +
    "你在产品里看到这周用了限额的 <strong>22%</strong>。" +
    "所以按同一口径倒推：一周打满大约 <strong>" +
    yi(WEEK) +
    "</strong>，一个月按 4 周算大约 <strong>" +
    yi(MONTH) +
    "</strong>。" +
    "这不是一次对话的数。一次推理平均就要送进去 " +
    yi(PER_LOOP_IN) +
    " 的输入。";

  document.getElementById("tri").innerHTML = [
    ["已用 · 22%", yi(USED), "输入 " + yi(T.prompt) + " ＋ 输出 " + yi(T.completion), true],
    ["一周满额 · 100%", yi(WEEK), "用 22% 反推（有账部分当下限）", false],
    ["一月满额 · ×4 周", yi(MONTH), "按你说的一个月按 4 周乘", false],
  ]
    .map(
      ([k, v, s, seal]) =>
        `<div class="cell"><div class="k">${k}</div><div class="v${seal ? " seal" : ""}">${v}</div><div class="s">${s}</div></div>`,
    )
    .join("");

  document.getElementById("hero-note").textContent =
    "日志只覆盖本周最后大约 10 小时，更早的 973 次循环没有逐次 token。若那些循环按你后半周的习惯补上，一周满额大约 " +
    yi(WEEK_FILL) +
    "，一月大约 " +
    yi(MONTH_FILL) +
    "。下面三块大数用的是「有账 = 22%」这条下限，避免把缺口估得太满。";

  document.getElementById("mistake").innerHTML =
    "上一版总览把「未缓存输入 " +
    yi(T.uncached) +
    "、输出 " +
    yi(T.completion) +
    "」摆在最显眼的位置，那是错的重点。" +
    "未缓存不是这一周的输入。官方字段里，每次循环的 <code>prompt_tokens</code> 才是送进模型的输入；" +
    "<code>cached_prompt_tokens</code> 是其中命中缓存的部分；未缓存 = 输入 − 缓存。" +
    "Agent 每调一次工具都会把当时整窗再送一遍，所以一场长对话的累计输入会到几千万。" +
    "你这周最大的一场（" +
    esc(TOP.title) +
    "）自己就送了 <strong>" +
    yi(TOP.prompt) +
    " 输入</strong>、吐了 " +
    yi(TOP.completion) +
    "，已经远大于 823 万。823 万只是这 " +
    yi(T.prompt) +
    " 里缓存没罩住、要新算的那一截。";

  document.getElementById("cmp").innerHTML = `
    <div class="box"><b>${yi(TOP.prompt)}</b><span>最大一场对话的累计输入（${TOP.inference_logged} 次有账循环）</span></div>
    <div class="box"><b>${yi(T.prompt)}</b><span>本周全部有账循环的累计输入（${T.inferences_logged} 次）</span></div>
    <div class="box"><b>${yi(T.uncached)}</b><span>其中未缓存、需要新算的输入。不是总输入。</span></div>
    <div class="box"><b>${yi(T.completion)}</b><span>本周全部输出，含思考。平均每次循环只吐 ${Math.round(PER_LOOP_OUT)} token，所以总量看起来不像「一场长文」。879 次加起来才到这个数。</span></div>
  `;

  document.getElementById("cache-plain").innerHTML =
    "命中率 = 缓存 token ÷ 输入 token = " +
    tok(T.cached) +
    " ÷ " +
    tok(T.prompt) +
    " = <strong>" +
    (T.cache_hit * 100).toFixed(1) +
    "%</strong>。" +
    "输入 : 输出 ≈ <strong>163 : 1</strong>（" +
    yi(T.prompt) +
    " : " +
    yi(T.completion) +
    "）。" +
    "未缓存 : 输出 ≈ 9.2 : 1。也就是说：你每让模型新写 1 个 token，大约同时又把 163 个旧 token 再送进去，其中约 154 个走缓存、9 个是新输入。";

  document.getElementById("mix").innerHTML = `
    <div class="box"><b>94.3%</b><span>缓存命中。数字来自每次 inference_done 的 cached_prompt_tokens / prompt_tokens，再对 879 次求和。</span></div>
    <div class="box"><b>163 : 1</b><span>累计输入 ÷ 累计输出。Agent 循环把这个比拉得极大。</span></div>
    <div class="box"><b>${yi(PER_LOOP_IN)} + ${Math.round(PER_LOOP_OUT)}</b><span>平均一次循环：送进去这么多，吐出这么多（吐出里大约 84% 是思考）。</span></div>
    <div class="box"><b>300 / 879</b><span>单次输入 ≥ 20 万的循环。xAI 规定这种请求整单按双倍 API 价。</span></div>
  `;

  document.getElementById("future").textContent =
    "以后估用量可以记这一套比例，不必每次再拆日志：一次典型循环 ≈ 送 16.6 万、吐 1000；一周若仍是这种 Agent 密度，输入会按循环次数线性涨，输出涨得慢。缓存维持九成四时，新算输入大约是总输入的 5.7%。";

  document.getElementById("api-plain").innerHTML =
    "按 grok-4.6 公开价（不到 20 万：$2 / 缓存 $0.50 / 输出 $6；满 20 万整单翻倍），把你这 879 次逐笔算完：" +
    "有账部分约 <strong>" +
    usd(T.usd_with_images) +
    "</strong>。" +
    "按你自己的混合比，相当于每百万输出大约 " +
    usd(USD_PER_M_OUT) +
    "，每百万累计输入大约 " +
    usd(USD_PER_M_IN) +
    "（大部分输入走了缓存价）。" +
    "若 22% 也按这个美元口径倒推，一周 API 等价大约 " +
    usd(Q.weekly_usd_from_logged_over_22) +
    "，一月 ×4 大约 " +
    usd(Q.monthly_usd_from_logged_x4) +
    "。缺口补全后大约一周 " +
    usd(Q.weekly_usd_from_conservative_over_22) +
    " 到 " +
    usd(Q.weekly_usd_from_filled_over_22) +
    "。";

  document.getElementById("api-tri").innerHTML = [
    ["有账 API 等价", usd(T.usd_with_images), "22% 实际（美元）"],
    ["一周满额 $", usd(Q.weekly_usd_from_logged_over_22), "÷ 0.22"],
    ["一月满额 $", usd(Q.monthly_usd_from_logged_x4), "× 4 周"],
  ]
    .map(
      ([k, v, s]) =>
        `<div class="cell"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`,
    )
    .join("");

  const talks = document.getElementById("talks-table");
  const drawTalks = () => {
    const q = (document.getElementById("q").value || "").toLowerCase();
    const rows = B.sessions.filter((s) =>
      [s.title, s.id, s.kind].join(" ").toLowerCase().includes(q),
    );
    talks.innerHTML = `<thead><tr>
      <th>对话</th><th>工作区</th><th>覆盖</th>
      <th class="n">循环</th><th class="n">有账</th>
      <th class="n">输入</th><th class="n">输出</th><th class="n">未缓存</th>
    </tr></thead><tbody>${rows
      .map(
        (s) => `<tr data-id="${esc(s.id)}">
        <td>${esc(s.title)}<br><span class="foot">${esc(s.id)}</span></td>
        <td>${esc(s.kind)}</td>
        <td>${esc(s.coverage)}</td>
        <td class="n">${s.loops_in}</td>
        <td class="n">${s.inference_logged}</td>
        <td class="n">${yi(s.prompt)}</td>
        <td class="n">${yi(s.completion)}</td>
        <td class="n">${yi(s.uncached)}</td>
      </tr>`,
      )
      .join("")}</tbody>`;
  };
  drawTalks();
  document.getElementById("q").addEventListener("input", drawTalks);
  talks.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    talks.querySelectorAll("tr.on").forEach((n) => n.classList.remove("on"));
    tr.classList.add("on");
    const s = B.sessions.find((x) => x.id === tr.dataset.id);
    const box = document.getElementById("talk-card");
    box.hidden = false;
    const tools = Object.entries(s.tools || {})
      .sort((a, b) => b[1] - a[1])
      .map(([n, c]) => n + " " + c)
      .join(" · ");
    box.innerHTML = `<strong>${esc(s.title)}</strong>
      <div>${esc(s.path)}</div>
      <div>cwd ${esc(s.cwd)}</div>
      <div>events ${esc(s.events_path || "—")}</div>
      <div>输入 ${tok(s.prompt)} · 缓存命中 ${s.prompt ? ((s.cache_hit * 100).toFixed(1) + "%") : "—"} · 输出 ${tok(s.completion)} · 未缓存 ${tok(s.uncached)}</div>
      <div>工具 ${esc(tools || "—")}</div>`;
    document.getElementById("sid").value = s.id;
    drawShots();
  });

  const shots = document.getElementById("shots-table");
  const drawShots = () => {
    const sid = document.getElementById("sid").value.trim();
    const tier = document.getElementById("tier").value;
    let rows = B.inferences || [];
    if (sid) rows = rows.filter((r) => r.sid === sid);
    if (tier) rows = rows.filter((r) => r.tier === tier);
    document.getElementById("shot-n").textContent = rows.length + " 条";
    const show = rows.slice(0, 600);
    shots.innerHTML = `<thead><tr>
      <th>时间 UTC</th><th>session</th><th class="n">loop</th><th>档</th>
      <th class="n">输入</th><th class="n">缓存</th><th class="n">未缓存</th>
      <th class="n">输出</th><th class="n">思考</th>
    </tr></thead><tbody>${show
      .map(
        (r) => `<tr>
        <td>${esc((r.ts || "").replace("T", " ").slice(0, 19))}</td>
        <td>${esc((r.sid || "").slice(0, 10))}…</td>
        <td class="n">${r.loop ?? ""}</td>
        <td>${esc(r.tier)}</td>
        <td class="n">${tok(r.prompt)}</td>
        <td class="n">${tok(r.cached)}</td>
        <td class="n">${tok(r.uncached)}</td>
        <td class="n">${tok(r.completion)}</td>
        <td class="n">${tok(r.reasoning)}</td>
      </tr>`,
      )
      .join("")}</tbody>`;
  };
  drawShots();
  document.getElementById("sid").addEventListener("input", drawShots);
  document.getElementById("tier").addEventListener("change", drawShots);

  document.getElementById("file-list").innerHTML = [
    "精确 token：" + B.meta.unified_log + " → shell.turn.inference_done",
    "全周循环次数：" + B.meta.sessions_root + " 下各 session/events.jsonl",
    "价格：https://x.ai/docs/developers/models/grok-4.6 （不到 20 万 $2/$0.50/$6，满 20 万翻倍）",
    "22% 来自你在产品里看到的周限额，不是日志推的。",
    "清零之后的推理已剔除，不进这 22%。",
    ...B.sessions.map((s) => s.path),
  ]
    .map((x) => "<li>" + esc(x) + "</li>")
    .join("");

  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.go).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
