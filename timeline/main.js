document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("background")
    .appendAnimation("./animations/background/background.html");
  document.getElementById("middleground")
    .appendAnimation("./animations/middleground/middleground.html");
  document.getElementById("foreground")
    .appendAnimation("./animations/foreground/foreground.html");

  document.querySelector("main").animate("./effects/camera-focus.json");
});
