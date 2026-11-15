/**
 * Title gate: poster → optional mission briefing → enter game.
 * The first click is also the gesture browsers need for fullscreen.
 */
(function () {
  "use strict";

  const BRIEFING_KEY = "grannyboom.mission-briefing-seen";

  const BEATS = [
    {
      step: "1 / 2",
      title: "Collect the map",
      copy: "Clear each maths topic to earn a map piece. There are 10 pieces.",
      cta: "NEXT",
    },
    {
      step: "2 / 2",
      title: "Fly to Doompickle",
      copy: "When all 10 are in, Granny warps to the alien homeworld for new games and challenges.",
      cta: "LET'S GO",
    },
  ];

  const screen = document.getElementById("title-screen");
  const primary = document.getElementById("title-enter");
  const skipPoster = document.getElementById("title-skip");
  const brief = document.getElementById("title-brief");
  const briefStep = document.getElementById("title-brief-step");
  const briefHeading = document.getElementById("title-brief-heading");
  const briefCopy = document.getElementById("title-brief-copy");
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

  // onclick survives better than only addEventListener when overlays steal pointer events.
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
