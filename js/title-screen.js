/**
 * Title gate: poster → optional mission briefing → enter game.
 * The first click is also the gesture browsers need for fullscreen.
 */
(function () {
  "use strict";

  const BRIEFING_KEY = "grannyboom.mission-briefing-seen";

  /** Same sector order as the Maths HQ nav chart. */
  const MAP_PIECES = [
    { ref: "8842", label: "1" },
    { ref: "7719", label: "2" },
    { ref: "6204", label: "3" },
    { ref: "3305", label: "4" },
    { ref: "4417", label: "5" },
    { ref: "9921", label: "6" },
    { ref: "5186", label: "7" },
    { ref: "2743", label: "8" },
    { ref: "1068", label: "9" },
    { ref: "7350", label: "10" },
  ];

  function mapVisual() {
    const cells = MAP_PIECES.map(
      (piece) => `
      <div class="title-map-cell">
        <div class="title-map-shroud" aria-hidden="true"></div>
        <span class="title-map-num">${piece.label}</span>
      </div>`
    ).join("");

    return `
      <div class="title-map" aria-label="Alien Homeland map with 10 locked pieces">
        <img
          class="title-map-img"
          src="assets/home/interstellar-map.jpg"
          alt=""
          width="1024"
          height="576"
          decoding="async"
        />
        <div class="title-map-grid">${cells}</div>
        <div class="title-map-home" aria-hidden="true">
          <span>HOME</span>
        </div>
      </div>`;
  }

  function inspireVisual() {
    return `
      <div class="title-inspire" aria-label="Doompickle and the alien homeworld">
        <img
          class="title-inspire-hero"
          src="assets/homeland/planet-map.webp"
          alt="The alien homeworld"
          width="1024"
          height="576"
          decoding="async"
        />
        <div class="title-inspire-row">
          <img
            src="assets/homeland/slides/landing-title.webp"
            alt="Doompickle"
            width="640"
            height="360"
            decoding="async"
          />
          <img
            src="assets/homeland/granny-front.webp"
            alt="Granny ready for battle"
            width="185"
            height="206"
            decoding="async"
          />
        </div>
      </div>`;
  }

  const BEATS = [
    {
      step: "1 / 2",
      title: "Collect all 10 map pieces",
      copy: "Earn a piece by completing 10 sets of a topic.",
      cta: "NEXT",
      visual: mapVisual,
    },
    {
      step: "2 / 2",
      title: "Fly to Doompickle",
      copy: "When all 10 are in, Granny warps to the alien homeworld for new games and challenges.",
      cta: "LET'S GO",
      visual: inspireVisual,
    },
  ];

  const screen = document.getElementById("title-screen");
  const primary = document.getElementById("title-enter");
  const skipPoster = document.getElementById("title-skip");
  const brief = document.getElementById("title-brief");
  const briefStep = document.getElementById("title-brief-step");
  const briefHeading = document.getElementById("title-brief-heading");
  const briefCopy = document.getElementById("title-brief-copy");
  const briefVisual = document.getElementById("title-brief-visual");
  const briefNext = document.getElementById("title-brief-next");
  const briefSkip = document.getElementById("title-brief-skip");

  if (!screen || !primary) return;

  let entering = false;
  let beatIndex = 0;
  let briefingDone = false;

  try {
    briefingDone = localStorage.getItem(BRIEFING_KEY) === "1";
  } catch (_) {
    briefingDone = false;
  }

  if (briefingDone) {
    primary.textContent = "LET'S GO";
    if (skipPoster) skipPoster.hidden = true;
  } else {
    primary.textContent = "NEXT";
  }

  const behind = () => document.querySelectorAll("body > :not(#title-screen)");

  behind().forEach((el) => {
    el.inert = true;
  });

  primary.focus({ preventScroll: true });

  function markBriefingSeen() {
    briefingDone = true;
    try {
      localStorage.setItem(BRIEFING_KEY, "1");
    } catch (_) {
      // Private mode — still proceed for this session.
    }
  }

  function requestFs() {
    const root = document.documentElement;
    const request =
      root.requestFullscreen ||
      root.webkitRequestFullscreen ||
      root.msRequestFullscreen;
    if (!request) return;
    try {
      const result = request.call(root, { navigationUI: "hide" });
      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }
    } catch (_) {
      // Unsupported or refused. Still let them in.
    }
  }

  function enterGame() {
    if (entering) return;
    entering = true;
    markBriefingSeen();
    requestFs();
    screen.classList.add("title-exiting");

    window.setTimeout(() => {
      behind().forEach((el) => {
        el.inert = false;
      });
      screen.remove();
      const welcome = document.getElementById("screen-welcome");
      if (welcome && welcome.classList.contains("active")) {
        const name = document.getElementById("player-name");
        if (name) name.focus();
      }
      window.dispatchEvent(new CustomEvent("siege:enter"));
    }, 400);
  }

  function showBeat(index) {
    beatIndex = index;
    const beat = BEATS[beatIndex];
    if (!beat || !brief) return;

    screen.dataset.step = `brief-${beatIndex + 1}`;
    screen.classList.add("is-briefing");
    brief.hidden = false;

    if (briefStep) briefStep.textContent = beat.step;
    if (briefHeading) briefHeading.textContent = beat.title;
    if (briefCopy) briefCopy.textContent = beat.copy;
    if (briefVisual) {
      briefVisual.innerHTML = typeof beat.visual === "function" ? beat.visual() : "";
      briefVisual.hidden = !briefVisual.innerHTML.trim();
    }
    if (briefNext) {
      briefNext.textContent = beat.cta;
      briefNext.focus({ preventScroll: true });
    }
  }

  function openBriefing() {
    requestFs();
    showBeat(0);
  }

  function advanceBriefing() {
    if (beatIndex >= BEATS.length - 1) {
      enterGame();
      return;
    }
    showBeat(beatIndex + 1);
  }

  function onPrimary() {
    if (entering) return;
    if (briefingDone) {
      enterGame();
      return;
    }
    if (screen.classList.contains("is-briefing")) {
      advanceBriefing();
      return;
    }
    openBriefing();
  }

  function onSkip() {
    if (entering) return;
    enterGame();
  }

  primary.onclick = onPrimary;
  if (skipPoster) skipPoster.onclick = onSkip;
  if (briefNext) {
    briefNext.onclick = () => {
      if (entering) return;
      advanceBriefing();
    };
  }
  if (briefSkip) briefSkip.onclick = onSkip;

  document.addEventListener("keydown", function (event) {
    if (entering || !screen.isConnected) return;
    if (event.key === "Escape" && screen.classList.contains("is-briefing")) {
      event.preventDefault();
      onSkip();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const tag = (event.target && event.target.tagName) || "";
      if (tag === "BUTTON" || tag === "A") return;
      event.preventDefault();
      if (screen.classList.contains("is-briefing")) advanceBriefing();
      else onPrimary();
    }
  });
})();
