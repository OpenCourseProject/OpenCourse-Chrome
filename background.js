var DETAIL_SCHEDULE_URL = "https://burke.cnu.edu:9997/bpdbdad/bwskfshd.P_CrseSchdDetl"
var ADD_DROP_URL_CHECK_PIN = "https://burke.cnu.edu:9997/bpdbdad/bwskfreg.P_CheckAltPin"
var ADD_DROP_URL = "https://burke.cnu.edu:9997/bpdbdad/bwskfreg.P_AltPin"

// Inject custom CSS
var css = chrome.runtime.getURL('assets/css/bootstrap.css');
$('head').append('<link rel="stylesheet" type="text/css" href="' + css + '">');

// Load the API username and key to get schedules
var api_username = null;
var api_key = null;
var term = null;
var ocpSchedule = null;
var liveSchedule = [];
var begun = false;
// Have we stored it locally? If so, retrieve it.
chrome.storage.sync.get(['api_username','api_key'], function(result) {
  api_username = result['api_username'];
  api_key = result['api_key'];
  // If not, let's try and grab it from the logged-in instance
  if (api_username == null) {
    var url = 'https://opencourseproject.com/api/username/'
    chrome.runtime.sendMessage({
      method: 'GET',
      action: 'xhttp',
      url: url,
      data: ''
    }, function(response) {
      // Save for next time
      chrome.storage.sync.set({'api_username': api_username}, function() {
        api_username = response;
        begin();
      });
    });
  } else {
    begin();
  }
  if (api_key == null) {
    var url = 'https://opencourseproject.com/api/key/'
    chrome.runtime.sendMessage({
      method: 'GET',
      action: 'xhttp',
      url: url,
      data: ''
    }, function(response) {
      // Save for next time
      chrome.storage.sync.set({'api_key': api_key}, function() {
        api_key = response;
        begin();
      });
    });
  } else {
    begin();
  }
});

function begin() {
  if (api_username != null && api_key != null && !begun) {
    begun = true;
    if (window.location.href == DETAIL_SCHEDULE_URL) {
      // Page header size tells us if term has been selected
      var headers = $(".staticheaders").text().split("\n");
      if (headers.length == 4) {
        // Term has not been selected, don't proceed
        return;
      }
      // Find the current term on the page header
      var termName = headers[2];
      // Lookup the term to get the matching OCP resource
      var url = 'https://opencourseproject.com/api/v1/term/?name=' + termName
      chrome.runtime.sendMessage({
        method: 'GET',
        action: 'xhttp',
        url: url,
        data: ''
      }, function(response) {
        term = JSON.parse(response).objects[0];
        // Inject the Schedule button
        addScheduleButton();
        // Get the user's schedule for this term
        var url = 'https://opencourseproject.com/api/v1/schedule/?username=' + api_username + '&api_key=' + api_key + '&term__name=' + term.name
        chrome.runtime.sendMessage({
          method: 'GET',
          action: 'xhttp',
          url: url,
          data: ''
        }, function(response) {
          ocpSchedule = JSON.parse(response).objects;
          // Look at all the term's courses
          var arr = $(".datadisplaytable");
          $.each( arr, function( index, value ) {
            var table = arr.eq(index);
            var header = table.find('.captiontext')
            // Get the course CRN
            if (header.text() != "Scheduled Meeting Times") {
              var crn = $(table.find(".dddefault")[1]).text();
              liveSchedule.push(crn)
              // Add a link to the header
              header.html('<div class="tbs"><a href="https://opencourseproject.com/course/' + term.value + '/' + crn + '/">' + header.text() + '</a></div>');
              // Is this course on OCP?
              var found = false;
              $.each(ocpSchedule, function(index, value) {
                if (value.course_crn == crn) {
                  header.append('<div class="tbs"><p class="text-success"><span class="glyphicon glyphicon-ok"></span> synced to OpenCourse</p></div>');
                  found = true;
                }
              });
              if (!found) {
                header.append('<div class="tbs"><p class="text-danger"><span class="glyphicon glyphicon-remove"></span> not synced to OpenCourse <button class="btn btn-primary btn-xs add-button" data-crn="' + crn + '">Add</button></p></div>');
              }
            }
          });
          // Add button for individual courses
          $(".add-button").click(function() {
            var crn = $(this).data('crn');
            var url = 'https://opencourseproject.com/api/v1/schedule/?username=' + api_username + '&api_key=' + api_key
            chrome.runtime.sendMessage({
              method: 'POST',
              action: 'xhttp',
              url: url,
              headers: {"Content-Type": "application/json"},
              data: '{"term": "' + term.resource_uri + '", "course_crn": "' + crn + '"}'
            }, function(response) {
              // Added, reload the page
              window.location.reload();
            });
          });
        });
      });
    } else if (window.location.href == ADD_DROP_URL || window.location.href == ADD_DROP_URL_CHECK_PIN) {
      // Verify we're past alternate PIN
      var title = $($('.pldefault').find('h2')[0]).text();
      if (title != "Add/Drop Classes: ") {
        // Pin hasn't been entered, don't proceed
        return;
      }
      // Page header size tells us if term has been selected
      var headers = $(".staticheaders").text().split("\n");
      if (headers.length == 4) {
        // Term has not been selected, don't proceed
        return;
      }
      // Find the current term on the page header
      var termName = headers[2];
      // Lookup the term to get the matching OCP resource
      var url = 'https://opencourseproject.com/api/v1/term/?name=' + termName
      chrome.runtime.sendMessage({
        method: 'GET',
        action: 'xhttp',
        url: url,
        data: ''
      }, function(response) {
        term = JSON.parse(response).objects[0];
        // Inject the schedule button
        addScheduleButton();
        // Get the user's schedule for this term
        var url = 'https://opencourseproject.com/api/v1/schedule/?username=' + api_username + '&api_key=' + api_key + '&term__name=' + term.name
        chrome.runtime.sendMessage({
          method: 'GET',
          action: 'xhttp',
          url: url,
          data: ''
        }, function(response) {
          ocpSchedule = JSON.parse(response).objects;
          // Inject the fill button
          addFillCRNButton();
        });
      });
    }
  }
}

// Schedule button
function addScheduleButton() {
  var point = $($(".datadisplaytable")[0]);
  var button = '<div class="tbs"><a href="https://opencourseproject.com/schedule/?term=' + term.value + '"><button class="btn btn-success btn-lg">View schedule on OpenCourse <span class="glyphicon glyphicon-share-alt" aria-hidden="true"></span></button></a></div>';
  $(point).before(button);
}

// Fill button
function addFillCRNButton() {
  var point = $($('form[action="/bpdbdad/bwckcoms.P_Regs"]')[0]);
  var button = '<br><div class="tbs"><button class="btn btn-primary btn-sm fill-button"><span class="glyphicon glyphicon-list-alt" aria-hidden="true"></span> Fill CRNs from OpenCourse</button></div>';
  $(point).after(button);
  $(".fill-button").click(function() {
    $.each($('.dedefault'), function( index, value ) {
      if (ocpSchedule.length >= index) {
        var crn = ocpSchedule[index].course_crn;
        var box = $(value).find('input[name="CRN_IN"]')[0];
        $(box).val(crn);
      }
    });
    return false;
  });
}
