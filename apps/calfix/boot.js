(function () {
  const currentFile = global.__FILE__ || "";

  if ("calendar.app.js" === currentFile) {
    const originalSetUI = Bangle.setUI;

    Bangle.setUI = (mode, callback) => {
      if (typeof mode === "object" && mode.swipe) {
        const originalSwipe = mode.swipe;
        mode.swipe = (dirLR, dirUD) => originalSwipe(dirLR*-1, dirUD*-1);
      }
      return originalSetUI(mode, callback);
    };
  }
})();
