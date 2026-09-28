const path = require("path");

function registerProfileRoute(app) {
  app.get("/profile", (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.sendFile(path.join(__dirname, "profile.html"));
  });

  app.get("/profile.html", (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.sendFile(path.join(__dirname, "profile.html"));
  });
}

module.exports = registerProfileRoute;
