/**
 * Title gate. The poster cannot be clicked; this button can.
 * The click is also the gesture browsers require before fullscreen.
 */
(function () {
  "use strict";

  const screen = document.getElementById("title-screen");
  const button = document.getElementById("title-enter");
  if (!screen || !button) return;

  let entering = false;

  const behind = () =>
    document.querySelectorAll("body > :not(#title-screen)");

  behind().forEach((el) => {
    el.inert = true;
  });

  button.focus({ preventScroll: true });

  function enterGame() {
    if (entering) return;
    entering = true;

    const root = document.documentElement;
    const request =
      root.requestFullscreen ||
      root.webkitRequestFullscreen ||
      root.msRequestFullscreen;

    if (request) {
      try {
        const result = request.call(root, { navigationUI: "hide" });
        if (result && typeof result.catch === "function") {
          result.catch(() => {});
        }
      } catch (_) {
        // Unsupported or refused. Still let them in.
      }
    }

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

  button.addEventListener("click", enterGame);

  document.addEventListener("keydown", function (event) {
    if (entering || !screen.isConnected) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      enterGame();
    }
  });
})();
