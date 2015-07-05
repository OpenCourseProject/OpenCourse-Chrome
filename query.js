/**
* Possible parameters for request:
*  action : "xhttp" for a cross-origin HTTP request
*  method : Default "GET"
*  url    : required, but not validated
*  data   : data to send in a POST request
*  headers: custom request headers
*
* The callback function is called upon completion of the request
*/
chrome.runtime.onMessage.addListener(function(request, sender, callback) {
  if (request.action == "xhttp") {
    var xhttp = new XMLHttpRequest();
    var method = request.method;
    var headers = request.headers;

    xhttp.onload = function() {
      callback(this);
    };
    xhttp.onerror = function() {
      // Do whatever you want on error. Don't forget to invoke the
      // callback to clean up the communication port.
      callback();
    };

    xhttp.open(method, request.url, true);

    if (headers) {
      for (var key in headers) {
        xhttp.setRequestHeader(key, headers[key]);
      }
    }

    xhttp.send(request.data);

    return true; // prevents the callback from being called too early on return
  }
});
