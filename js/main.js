/* ==========================================================================
   个人作品集 · 交互逻辑
   职责：
   1. 加载并渲染作品数据（data/works.json）
   2. 生成分类筛选按钮 + 筛选交互
   3. 移动端菜单、导航滚动状态
   4. 滚动渐入动效、页脚年份
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- 作品数据（作为本地 file:// 预览时的兜底数据） ----------
     说明：正常情况下会优先 fetch data/works.json（单一数据源）。
     仅当通过 file:// 直接打开网页、fetch 因浏览器安全策略失败时，
     才使用下面这份与 works.json 内容一致的兜底数据，保证预览不空白。
     正式发布后始终以 works.json 为准。 */
  var FALLBACK_WORKS = [
    {
      id: "work-1",
      title: "品牌视觉设计",
      category: "设计",
      description: "为某品牌打造的完整视觉识别系统，包含标志、色彩与排版规范。",
      image: "",
      link: "",
      color: "#1f3d33"
    },
    {
      id: "work-2",
      title: "响应式网站开发",
      category: "开发",
      description: "一个响应式企业官网项目，兼顾性能与可访问性。",
      image: "",
      link: "",
      color: "#4a5568"
    },
    {
      id: "work-3",
      title: "插画与视觉创作",
      category: "创作",
      description: "系列插画与视觉探索，聚焦色彩与叙事表达。",
      image: "",
      link: "",
      color: "#8c6f4d"
    }
  ];

  /* ---------- DOM 引用 ---------- */
  var filterBar = document.getElementById("filterBar");
  var worksGrid = document.getElementById("worksGrid");
  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");
  var header = document.getElementById("siteHeader");

  var works = [];      // 当前全部作品
  var activeFilter = "全部"; // 当前选中的分类

  /* ---------- 工具：将十六进制颜色调暗，用于封面渐变 ---------- */
  function adjustColor(hex, amount) {
    var n = parseInt(hex.slice(1), 16);
    var clamp = function (v) { return Math.max(0, Math.min(255, v)); };
    var r = clamp((n >> 16) + amount);
    var g = clamp(((n >> 8) & 0xff) + amount);
    var b = clamp((n & 0xff) + amount);
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  /* ---------- 安全转义，防止作品文本中的特殊字符破坏 HTML ---------- */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- 加载作品数据 ---------- */
  function loadWorks() {
    return fetch("data/works.json")
      .then(function (res) {
        if (!res.ok) throw new Error("加载失败");
        return res.json();
      })
      .catch(function () {
        // file:// 下 fetch 不可用，回退到内嵌兜底数据
        console.warn("works.json 加载失败，使用内嵌兜底数据（本地预览模式）");
        return FALLBACK_WORKS;
      });
  }

  /* ---------- 渲染分类筛选按钮 ---------- */
  function renderFilters(categories) {
    filterBar.innerHTML = "";

    categories.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.className = "filter-btn" + (cat === activeFilter ? " active" : "");
      btn.textContent = cat;
      btn.setAttribute("role", "tab");
      btn.addEventListener("click", function () {
        activeFilter = cat;
        renderFilters(categories);
        renderWorks();
      });
      filterBar.appendChild(btn);
    });
  }

  /* ---------- 渲染作品卡片 ---------- */
  function renderWorks() {
    worksGrid.innerHTML = "";

    var list = works.filter(function (w) {
      return activeFilter === "全部" || w.category === activeFilter;
    });

    if (list.length === 0) {
      var empty = document.createElement("div");
      empty.className = "works-empty";
      empty.textContent = "该分类下暂无作品，敬请期待。";
      worksGrid.appendChild(empty);
      return;
    }

    list.forEach(function (w) {
      var card = document.createElement("article");
      card.className = "work-card reveal";

      // 封面：有图片则显示图片，否则用渐变色 + 首字占位
      var cover = document.createElement("div");
      cover.className = "work-cover";
      if (w.image) {
        var img = document.createElement("img");
        img.src = w.image;
        img.alt = w.title;
        img.loading = "lazy";
        cover.appendChild(img);
      } else {
        cover.style.background =
          "linear-gradient(135deg, " + w.color + ", " + adjustColor(w.color, -45) + ")";
        cover.textContent = w.title.charAt(0);
      }

      var body = document.createElement("div");
      body.className = "work-body";

      var category = document.createElement("span");
      category.className = "work-category";
      category.textContent = w.category;

      var title = document.createElement("h3");
      title.className = "work-title";
      title.textContent = w.title;

      var desc = document.createElement("p");
      desc.className = "work-desc";
      desc.textContent = w.description;

      body.appendChild(category);
      body.appendChild(title);
      body.appendChild(desc);
      card.appendChild(cover);
      card.appendChild(body);

      // 若有链接，点击整卡在新标签打开
      if (w.link) {
        card.style.cursor = "pointer";
        card.addEventListener("click", function () {
          window.open(w.link, "_blank", "noopener");
        });
      }

      worksGrid.appendChild(card);
    });

    // 新渲染的卡片也纳入滚动渐入观察
    observeReveal();
  }

  /* ---------- 初始化：加载数据并渲染 ---------- */
  function init() {
    loadWorks().then(function (data) {
      works = Array.isArray(data) ? data : [];
      var categories = ["全部"].concat(
        Array.from(new Set(works.map(function (w) { return w.category; })))
      );
      renderFilters(categories);
      renderWorks();
    });
  }

  /* ---------- 滚动渐入动效（IntersectionObserver） ---------- */
  var revealObserver = null;

  function observeReveal() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (el) {
        el.classList.add("visible");
      });
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
    }

    document.querySelectorAll(".reveal:not(.visible)").forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------- 导航滚动状态 + 移动端菜单 ---------- */
  function initNav() {
    // 滚动时给导航加细边框
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 10);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // 移动端菜单开关
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });

    // 点击导航链接后收起菜单（移动端）
    nav.addEventListener("click", function (e) {
      if (e.target.classList.contains("nav-link")) {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- 页脚年份 ---------- */
  function initYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------- 启动 ---------- */
  init();
  initNav();
  initYear();
  observeReveal();
})();
