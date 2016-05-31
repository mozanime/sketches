Element.prototype.originalAnimate = Element.prototype.animate;
Element.prototype.animate = function() {
  if (arguments.length === 1) {
    var request = new XMLHttpRequest();
    request.open("GET", arguments[0], false);
    request.send();
    if (request.status !== 200) {
      throw new Error(`could not get effect json[${arguments[0]}]`);
    }
    var json = JSON.parse(request.responseText);
    arguments = [json.keyframes, json.timing];
  }
  return Element.prototype.originalAnimate.apply(this, arguments);
}

Element.prototype.appendAnimation = function(url) {
  var iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.scrolling = "no";
  iframe.frameborder = "no";
  iframe.style.border = "none";
  this.appendChild(iframe);
};
