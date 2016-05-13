var DETAIL_SCHEDULE_URL = "https://burke.cnu.edu:9997/bpdbdad/bwskfshd.P_CrseSchdDetl"
var ADD_DROP_URL_CHECK_PIN = "https://burke.cnu.edu:9997/bpdbdad/bwskfreg.P_CheckAltPin"
var ADD_DROP_URL = "https://burke.cnu.edu:9997/bpdbdad/bwskfreg.P_AltPin"

// Inject custom CSS
var css = chrome.runtime.getURL('assets/css/bootstrap.css');
$('head').append('<link rel="stylesheet" type="text/css" href="' + css + '">');

// Matching usernames and keys lets us determine if we're logged-in
var username_re = /^([a-zA-z])+\.([a-zA-z])+\.[0-9]{2}$/
var key_re = /^([a-zA-z0-9]){40}$/

// Load the API username and key to get schedules
var api_username = null;
var api_key = null;
var term = null;
var ocpSchedule = null;
var liveSchedule = [];

// Get the API username
var url = 'https://opencourseproject.com/api/username/'
var user_request = new XMLHttpRequest();
user_request.open("GET", url, true);
user_request.onload = function() {
  // Check if we've got a valid username
  var valid = username_re.test(this.responseText)
  if (valid) {
    api_username = this.responseText;
    // Get the API key
    url = 'https://opencourseproject.com/api/key/'
    var key_request = new XMLHttpRequest();
    key_request.open("GET", url, true);
    key_request.onload = function() {
      // Check if we've got a valid key
      var valid = key_re.test(this.responseText)
      if (valid) {
        api_key = this.responseText;
        // Start the API interaction
        begin();
      } else {
        // Something's wrong :(
        addLoginButton('Account Error! Log in again');
      }
    };
    key_request.send();
  } else {
    // We're not logged in, add a button to do so
    addLoginButton('Click to login on OpenCourse');
  }
};
user_request.send();

function begin() {
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
    var term_request = new XMLHttpRequest();
    term_request.open("GET", url, true);
    term_request.setRequestHeader("Accept", "application/json");
    term_request.onload = function() {
      term = JSON.parse(this.responseText).objects[0];
      // Inject the Schedule button
      addScheduleButton();
      // Get the user's schedule for this term
      var url = 'https://opencourseproject.com/api/v1/schedule/?term__name=' + term.name
      var schedule_request = new XMLHttpRequest();
      schedule_request.open("GET", url, true);
      schedule_request.setRequestHeader("Authorization", "ApiKey " + api_username + ":" + api_key);
      schedule_request.setRequestHeader("Accept", "application/json");
      schedule_request.onload = function() {
        ocpSchedule = JSON.parse(this.responseText).objects;
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
          var url = 'https://opencourseproject.com/api/v1/schedule/'
          var add_request = new XMLHttpRequest();
          add_request.open("POST", url, true);
          add_request.setRequestHeader("Content-Type", "application/json");
          add_request.setRequestHeader("Authorization", "ApiKey " + api_username + ":" + api_key);
          add_request.setRequestHeader("Accept", "application/json");
          add_request.onload = function() {
            window.location.reload();
          };
          add_request.send('{"term": "' + term.resource_uri + '", "course_crn": "' + crn + '"}');
        });
      };
      schedule_request.send();
    };
    term_request.send();
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
    var term_request = new XMLHttpRequest();
    term_request.open("GET", url, true);
    term_request.setRequestHeader("Accept", "application/json");
    term_request.onload = function() {
      term = JSON.parse(this.responseText).objects[0];
      // Inject the schedule button
      addScheduleButton();
      // Get the user's schedule for this term
      var url = 'https://opencourseproject.com/api/v1/schedule/?term__name=' + term.name
      var schedule_request = new XMLHttpRequest();
      schedule_request.open("GET", url, true);
      schedule_request.setRequestHeader("Authorization", "ApiKey " + api_username + ":" + api_key);
      schedule_request.setRequestHeader("Accept", "application/json");
      schedule_request.onload = function() {
        ocpSchedule = JSON.parse(this.responseText).objects;
        // Inject the fill button
        addFillCRNButton();
      };
    };
  }
}

// Login button (unauthenticated)
function addLoginButton(text) {
  var point = $($(".datadisplaytable")[0]);
  var button = '<div class="tbs"><a href="https://opencourseproject.com/account/" target="_blank"><button class="btn btn-success btn-lg">' + text + ' <span class="glyphicon glyphicon-share-alt" aria-hidden="true"></span></button></a></div>';
  $(point).before(button);
}

// Schedule button
function addScheduleButton() {
  var point = $($(".datadisplaytable")[0]);
  var button = '<div class="tbs"><a href="https://opencourseproject.com/schedule/?term=' + term.value + '" target="_blank"><button class="btn btn-success btn-lg">View schedule on OpenCourse <span class="glyphicon glyphicon-share-alt" aria-hidden="true"></span></button></a></div>';
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
