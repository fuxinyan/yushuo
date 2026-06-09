const ACCESS_CODE = "yu-shuo-8Qn2-2026";
const gate = document.querySelector("#accessGate");
const gateForm = document.querySelector("#gateForm");
const gateError = document.querySelector("#gateError");
const accessInput = document.querySelector("#accessCode");
const chips = document.querySelectorAll(".chip");
const quoteGrid = document.querySelector("#quoteGrid");
const liveGrid = document.querySelector("#liveGrid");
const liveStatus = document.querySelector("#liveStatus");
const totalMetric = document.querySelector("#totalMetric");
const simForm = document.querySelector("#simForm");
const simInput = document.querySelector("#simInput");
const simResult = document.querySelector("#simResult");
const contributeForm = document.querySelector("#contributeForm");
const formStatus = document.querySelector("#formStatus");
const backend = window.YUSHUO_BACKEND || {};
const baseCount = 128;

const riskyPatterns = [
  /1[3-9]\d{9}/,
  /[\w.-]+@[\w.-]+\.\w+/,
  /微信|手机号|身份证|住址|照片|截图|导师姓名|真实姓名|学院|课题组|学校|工号|邮箱/,
];

const categoryMeta = {
  投饵: { kind: "bait", className: "" },
  甩尾: { kind: "tail", className: "danger" },
  潜水: { kind: "dive", className: "blue" },
  改水温: { kind: "drift", className: "amber" },
  责任回潮: { kind: "tail", className: "danger" },
};

if (window.localStorage.getItem("yushuo-unlocked") === "true") {
  unlockGate();
}

loadLiveSubmissions();

gateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = accessInput.value.trim();

  if (value === ACCESS_CODE) {
    window.localStorage.setItem("yushuo-unlocked", "true");
    unlockGate();
    return;
  }

  gateError.textContent = "访问码不对，请确认后再试。";
  accessInput.select();
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const filter = chip.dataset.filter;
    chips.forEach((item) => item.classList.toggle("active", item === chip));
    document.querySelectorAll(".quote-card").forEach((card) => {
      const shouldShow = filter === "all" || card.dataset.kind === filter;
      card.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

simForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = simInput.value.trim();

  if (!text) {
    simResult.textContent = "请输入一句待分析水文。";
    return;
  }

  const result = analyzeWaterline(text);
  simResult.textContent = `识别结果：${result.type}\n\n水流特征：${result.pattern}\n\n低冲突回应：${result.reply}`;
});

contributeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(contributeForm);
  const scene = String(formData.get("scene") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const material = String(formData.get("material") || "").trim();
  const checked = document.querySelector("#anonymousCheck").checked;

  formStatus.classList.remove("warn");

  if (!scene || !material) {
    formStatus.textContent = "请至少补充匿名场景和素材正文。";
    formStatus.classList.add("warn");
    return;
  }

  if (!checked) {
    formStatus.textContent = "请先确认已删除可识别信息。";
    formStatus.classList.add("warn");
    return;
  }

  if (riskyPatterns.some((pattern) => pattern.test(material))) {
    formStatus.textContent = "检测到可能的隐私或可识别信息，请再匿名化后提交。";
    formStatus.classList.add("warn");
    return;
  }

  const payload = { scene, category, material };
  formStatus.textContent = "正在提交。";

  submitMaterial(payload)
    .then((saved) => {
      renderSubmission(saved, true);
      formStatus.textContent = isBackendConfigured()
        ? "已提交并上线。刷新页面后仍会公开显示。"
        : "已在当前浏览器上线预览。配置素材库后，其他人也能看到。";
      contributeForm.reset();
    })
    .catch(() => {
      formStatus.textContent = "提交失败，请稍后再试。";
      formStatus.classList.add("warn");
    });
});

function unlockGate() {
  gate.classList.add("unlocked");
  setTimeout(() => {
    gate.hidden = true;
  }, 460);
}

async function loadLiveSubmissions() {
  if (!isBackendConfigured()) {
    liveStatus.textContent = "素材库尚未配置，投稿只会在当前浏览器预览。";
    return;
  }

  try {
    const response = await fetch(
      `${getSupabaseUrl()}/rest/v1/submissions?select=id,scene,category,material,created_at&order=created_at.desc&limit=48`,
      {
        headers: getSupabaseHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load submissions");
    }

    const submissions = await response.json();
    liveGrid.innerHTML = "";
    submissions.forEach((item) => renderSubmission(item, false));
    updateLiveStatus(submissions.length);

    if (submissions.length === 0) {
      liveGrid.innerHTML = getEmptyStateHtml("还没有公开来稿", "第一条匿名投稿会自动出现在这里。");
    }
  } catch {
    liveStatus.textContent = "素材库连接失败，请检查 Supabase 配置。";
    liveStatus.classList.add("warn");
  }
}

async function submitMaterial(payload) {
  if (!isBackendConfigured()) {
    const localItem = {
      ...payload,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const drafts = JSON.parse(window.localStorage.getItem("yushuo-drafts") || "[]");
    drafts.unshift(localItem);
    window.localStorage.setItem("yushuo-drafts", JSON.stringify(drafts));
    return localItem;
  }

  const response = await fetch(`${getSupabaseUrl()}/rest/v1/submissions`, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to submit material");
  }

  const [saved] = await response.json();
  return saved;
}

function renderSubmission(item, prepend) {
  liveGrid.querySelector(".empty-state")?.remove();
  const card = createSubmissionCard(item);
  if (prepend) {
    liveGrid.prepend(card.cloneNode(true));
    quoteGrid.prepend(createQuoteCard(item));
  } else {
    liveGrid.append(card);
    quoteGrid.append(createQuoteCard(item));
  }
  updateLiveStatus(liveGrid.querySelectorAll(".live-card").length);
}

function createSubmissionCard(item) {
  const meta = categoryMeta[item.category] || { className: "" };
  const article = document.createElement("article");
  article.className = "live-card";

  const tag = document.createElement("span");
  tag.className = `tag ${meta.className}`.trim();
  tag.textContent = item.category || "匿名";

  const heading = document.createElement("h3");
  heading.textContent = item.scene || "匿名场景";

  const body = document.createElement("p");
  body.textContent = item.material || "";

  const time = document.createElement("time");
  time.dateTime = item.created_at || "";
  time.textContent = formatDate(item.created_at);

  article.append(tag, heading, body, time);
  return article;
}

function createQuoteCard(item) {
  const meta = categoryMeta[item.category] || { kind: "bait", className: "" };
  const article = document.createElement("article");
  article.className = "quote-card";
  article.dataset.kind = meta.kind;

  const tag = document.createElement("span");
  tag.className = `tag ${meta.className}`.trim();
  tag.textContent = item.category || "匿名";

  const quote = document.createElement("blockquote");
  quote.textContent = `“${item.material || ""}”`;

  const note = document.createElement("p");
  note.textContent = `匿名场景：${item.scene || "未标注"}`;

  article.append(tag, quote, note);
  return article;
}

function updateLiveStatus(count) {
  liveStatus.classList.remove("warn");
  liveStatus.textContent = isBackendConfigured()
    ? `已公开 ${count} 条匿名来稿。`
    : `当前浏览器预览 ${count} 条匿名来稿。`;
  totalMetric.textContent = String(baseCount + count);
}

function getEmptyStateHtml(title, copy) {
  return `<article class="empty-state"><h3>${title}</h3><p>${copy}</p></article>`;
}

function isBackendConfigured() {
  return Boolean(backend.supabaseUrl && backend.supabaseAnonKey);
}

function getSupabaseUrl() {
  return backend.supabaseUrl.replace(/\/$/, "");
}

function getSupabaseHeaders() {
  return {
    apikey: backend.supabaseAnonKey,
    Authorization: `Bearer ${backend.supabaseAnonKey}`,
  };
}

function formatDate(value) {
  if (!value) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function analyzeWaterline(text) {
  const normalized = text.toLowerCase();

  if (/帮助|成长|锻炼|机会|资源|以后|长期/.test(normalized)) {
    return {
      type: "投饵型水文",
      pattern: "用未来收益覆盖当前成本，常见于边界尚未明确的任务绑定。",
      reply:
        "我理解这个任务有成长价值。为了安排投入，我想确认这次的具体产出、验收标准、署名安排和时间节点。",
    };
  }

  if (/你自己|把握|执行|理解|主动|独立/.test(normalized)) {
    return {
      type: "甩尾型水文",
      pattern: "把模糊决策转译为执行者责任，复盘时容易出现责任下沉。",
      reply:
        "我会主动推进。为了避免理解偏差，我先把当前方案和需要您确认的决策点列出来。",
    };
  }

  if (/之后|再说|先做|继续|回头|细聊/.test(normalized)) {
    return {
      type: "潜水型水文",
      pattern: "关键判断被延后，但执行成本立即发生。",
      reply:
        "可以先推进一个最小版本。请问我们下次确认的时间点是什么？如果方向不合适，哪些部分需要及时停止？",
    };
  }

  if (/不是这个意思|本来|标准|太机械|重新|调整/.test(normalized)) {
    return {
      type: "改水温型水文",
      pattern: "对既有标准进行重新解释，使原始约定变得不稳定。",
      reply:
        "我明白标准有调整。为了后续一致，我把新版标准写成三条，请您看是否准确。",
    };
  }

  return {
    type: "混合水流",
    pattern: "可能同时包含边界模糊、责任回流或标准漂移，需要先把口头表述固化。",
    reply:
      "我先确认一下我的理解：这件事的目标、交付物、截止时间和判断标准分别是什么？我整理后发您确认。",
  };
}
