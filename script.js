const ACCESS_CODE = "yu-shuo-8Qn2-2026";
const gate = document.querySelector("#accessGate");
const gateForm = document.querySelector("#gateForm");
const gateError = document.querySelector("#gateError");
const accessInput = document.querySelector("#accessCode");
const chips = document.querySelectorAll(".chip");
const quoteCards = document.querySelectorAll(".quote-card");
const simForm = document.querySelector("#simForm");
const simInput = document.querySelector("#simInput");
const simResult = document.querySelector("#simResult");
const contributeForm = document.querySelector("#contributeForm");
const formStatus = document.querySelector("#formStatus");

const riskyPatterns = [
  /1[3-9]\d{9}/,
  /[\w.-]+@[\w.-]+\.\w+/,
  /微信|手机号|身份证|住址|照片|截图|导师姓名|真实姓名|学院|课题组/,
];

if (window.localStorage.getItem("yushuo-unlocked") === "true") {
  unlockGate();
}

gateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = accessInput.value.trim();

  if (value === ACCESS_CODE) {
    window.localStorage.setItem("yushuo-unlocked", "true");
    unlockGate();
    return;
  }

  gateError.textContent = "访问码不对。你可以使用页面上的演示访问码进入原型。";
  accessInput.select();
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const filter = chip.dataset.filter;
    chips.forEach((item) => item.classList.toggle("active", item === chip));
    quoteCards.forEach((card) => {
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

  const drafts = JSON.parse(window.localStorage.getItem("yushuo-drafts") || "[]");
  drafts.push({
    scene,
    category,
    material,
    createdAt: new Date().toISOString(),
  });
  window.localStorage.setItem("yushuo-drafts", JSON.stringify(drafts));

  formStatus.textContent = `已保存到本地草稿箱。当前共有 ${drafts.length} 条匿名草稿。`;
  contributeForm.reset();
});

function unlockGate() {
  gate.classList.add("unlocked");
  setTimeout(() => {
    gate.hidden = true;
  }, 460);
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
