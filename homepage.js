// ── Starfield ──
const canvas = document.getElementById("starCanvas");
const ctx = canvas.getContext("2d");
let stars = [];

const cfg = { count: 180, speed: 5, size: 5 };
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let starColor = getStarColor();
let animationFrame = 0;
let lastFrameTime = 0;

function getStarColor() {
  const v = getComputedStyle(document.body)
    .getPropertyValue("--star-color")
    .trim();
  return v || "220, 210, 185";
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initStars() {
  const speedBase = cfg.speed * 0.0015;
  const sizeBase = cfg.size * 0.18;
  stars = [];
  for (let i = 0; i < cfg.count; i++) {
    const bright = Math.random() < 0.15;
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: bright
        ? sizeBase * (Math.random() * 0.8 + 1.2)
        : sizeBase * (Math.random() * 0.6 + 0.4),
      a: Math.random(),
      min: bright ? 0.15 : 0.04,
      max: bright ? 0.95 : 0.5,
      da:
        (Math.random() * speedBase + speedBase * 0.4) *
        (Math.random() < 0.5 ? 1 : -1),
    });
  }
}

// Theme color changes only with the theme. Avoid a style lookup on every frame.
function draw(time = 0) {
  animationFrame = 0;
  if (!ctx) return;
  const elapsed = lastFrameTime
    ? Math.min(3, (time - lastFrameTime) / (1000 / 60))
    : 1;
  lastFrameTime = time;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stars.forEach((star) => {
    if (!reducedMotion.matches) {
      star.a += star.da * elapsed;
      if (star.a <= star.min || star.a >= star.max) star.da *= -1;
      star.a = Math.max(star.min, Math.min(star.max, star.a));
    }
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${starColor}, ${star.a})`;
    ctx.fill();
  });
  if (!reducedMotion.matches && !document.hidden)
    animationFrame = requestAnimationFrame(draw);
}

function redraw() {
  cancelAnimationFrame(animationFrame);
  lastFrameTime = 0;
  draw();
}
resize();
initStars();
redraw();
window.addEventListener("resize", () => {
  resize();
  initStars();
  redraw();
});
reducedMotion.addEventListener("change", redraw);
document.addEventListener("visibilitychange", redraw);

// ── Settings panel ──
const btn = document.getElementById("settings-btn");
const panel = document.getElementById("settings-panel");
function setSettingsOpen(open) {
  panel.classList.toggle("open", open);
  btn.setAttribute("aria-expanded", String(open));
}
btn.addEventListener("click", () =>
  setSettingsOpen(!panel.classList.contains("open")),
);
document.addEventListener("click", (e) => {
  if (!panel.contains(e.target) && !btn.contains(e.target))
    setSettingsOpen(false);
});

function wire(id, lblId, key, reinit) {
  const el = document.getElementById(id);
  const lb = document.getElementById(lblId);
  el.addEventListener("input", () => {
    cfg[key] = +el.value;
    lb.textContent = el.value;
    if (reinit) initStars();
    redraw();
  });
}
wire("sl-count", "lbl-count", "count", true);
wire("sl-speed", "lbl-speed", "speed", true);
wire("sl-size", "lbl-size", "size", true);

// ── Resources dropdown ──
const dropTrigger = document.querySelector(".nav-dropdown-trigger");
const dropMenu = document.querySelector(".nav-dropdown-menu");
const dropdown = document.querySelector(".nav-dropdown");
function setResourcesOpen(open) {
  dropMenu.classList.toggle("open", open);
  dropTrigger.setAttribute("aria-expanded", String(open));
}
dropTrigger.addEventListener("click", () =>
  setResourcesOpen(!dropMenu.classList.contains("open")),
);
dropdown.addEventListener("pointerenter", (event) => {
  if (event.pointerType === "mouse") setResourcesOpen(true);
});
dropdown.addEventListener("pointerleave", () => {
  if (!dropdown.contains(document.activeElement)) setResourcesOpen(false);
});
dropdown.addEventListener("focusout", (event) => {
  if (!dropdown.contains(event.relatedTarget)) setResourcesOpen(false);
});
document.addEventListener("click", (event) => {
  if (!dropdown.contains(event.target)) setResourcesOpen(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (panel.classList.contains("open")) {
    setSettingsOpen(false);
    btn.focus();
  }
  if (dropMenu.classList.contains("open")) {
    setResourcesOpen(false);
    dropTrigger.focus();
  }
});

// ── Light / dark toggle ──
const track = document.getElementById("mode-toggle");
let isLight = false;
track.addEventListener("click", () => {
  isLight = !isLight;
  document.body.classList.toggle("light", isLight);
  track.classList.toggle("on", isLight);
  track.setAttribute("aria-checked", String(isLight));
  starColor = getStarColor();
  redraw();
});

// ── Scroll reveal ──
const reveals = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.1 },
);
reveals.forEach((el) => observer.observe(el));
