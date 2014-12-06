// ==UserScript==
// @name			iRacing Auto Join
// @version			1.14.3
// @author			Paul Ilbrink
// @copyright		2012 - 2014, Paul Ilbrink
// @namespace		http://www.paulilbrink.nl/userscripts
// @description		This script add's an auto join checkbox after registering for a session. Once the timer ends and the green Join, Watch or Spot button comes available it's automatically clicked
// @downloadURL		http://www.paulilbrink.nl/userscripts/iracing-auto-join.user.js
// @updateURL		http://www.paulilbrink.nl/userscripts/iracing-auto-join.meta.js
// @match			http://members.iracing.com/membersite/member/*
// @exclude			http://members.iracing.com/membersite/member/EventResult*
// @exclude			http://members.iracing.com/membersite/member/JoinedRace.do
// @credits			http://userscripts.org/scripts/show/74072
// @credits			http://stackoverflow.com/questions/2588513/why-doesnt-jquery-work-in-chrome-user-scripts-greasemonkey
// @grant			none
// ==/UserScript==

var script = document.createElement("script");
script.textContent = "(" + PI_iRacingAutoJoin.toString() + ")();";
console.log('%cAutoJoin: document.body: %s', 'background: #090; color: #fff', document.body);
document.getElementsByTagName('body')[0].appendChild(script);

function PI_iRacingAutoJoin() {
	var PI_debug = false;

	var PI_AJ_id = 'piAutoJoin';
	var PI_AJ_checkbox;
	var PI_AJ_clicked = false;
	var PI_AJ_clicked_session_id = -1;
	var PI_AJ_remember_between_sessions = false; // change to 'true' if you want the checkbox status to be remembered

	function PI_log(msg, forceLog) {
		forceLog = forceLog || false;
		if ((true || PI_debug || forceLog) && typeof console !== 'undefined') {
			console.log('%cAutoJoin: ' + msg, 'background: #f72; color: #fff');
		}
	}

	if (typeof GM_addStyle !== 'function') {
		GM_addStyle = function(css) {
			var style = document.createElement('style');
			style.textContent = css;
			console.log('%cAutoJoin: document.head: %s', 'background: #090; color: #fff', document.head);
			document.getElementsByTagName('head')[0].appendChild(style);
		};
	}

	function PI_AJ_addEventListeners() {
		$(document).on('DOMSubtreeModified', '#racingpanel_sessionstatus', function(e) {
			PI_AJ_handleButton();
		});
		$(document).on('change', '#' + PI_AJ_id, function() {
			$.cookie(PI_AJ_id, this.checked, {
				path: '/membersite',
				expires: (PI_AJ_remember_between_sessions ? 365 : 2)
			});
			// so we have enabled the checkbox manually again, so auto click is allowed again
			if (this.checked) {
				PI_log('manual change detected, auto join allowed');
				$.cookie(PI_AJ_id + '_session_clicked', null, {
					path: '/membersite'
				});
				PI_AJ_readClickCookie();
			}
			PI_log('cookie val update, it now is: ' + $.cookie(PI_AJ_id));
		});
	}

	function PI_AJ_removeListeners() {
		$(document).off('DOMSubtreeModified', '#racingpanel_sessionstatus');
		$(document).off('change', '#' + PI_AJ_id);
	}

	function PI_AJ_getButton() {
		var button;
        var jqButtonList = $('#joinOptionsDiv > #SingleTeamJoinButton,#racingpanel_sessionstatus > div > div.racingpanel_button,#racingpanel_sessionstatus > div > a.racepanel_btn');
        var jqButton = jqButtonList.first();

		if (jqButton.length) {
            PI_log('oke we have a button, but what did the whole list consist off?');
            PI_log(jqButtonList);
			button = {};

			button.text = jqButton.text();
			button.object = jqButton;

			// color
			var bgPattern = /cpb_(green|red|black)\.gif/;
			var bgImg = jqButton.css('background-image');
			if (bgImg === 'none')
				bgImg = jqButton.find('.racepanel_btn').css('background-image');
			if (bgPattern.test(bgImg))
				button.color = bgPattern.exec(bgImg)[1];
		}

		return button;
	}

	function PI_AJ_handleButton() {
		var button = PI_AJ_getButton();
		if (button) {
			switch (button.color) {
				case 'green':
					PI_AJ_click(button);
					break;
				default:
					if (/(Registration (Rejected|Closed)|Connected)/.test(button.text)) {
						PI_log('cleaning up from handleButton');
						PI_AJ_cleanUp();
						return;
					}
					PI_AJ_addCheckbox(button);
					break;
			}
		}
	}

	function PI_AJ_click(button) {
		PI_log('clicking... cookie value is: ' + $.cookie(PI_AJ_id));
		PI_log('this was the cookie val from id: ' + PI_AJ_id);
		PI_log('and the button stuff that triggered the click is: ');
		PI_log(button);
		PI_log('current session id is ' + racingpaneldata.session.sessionid);
		PI_log('stored cookie session id is ' + PI_AJ_clicked_session_id);
		PI_log('sessions match? ' + (racingpaneldata.session.sessionid === PI_AJ_clicked_session_id));
		var clickNow = $.cookie(PI_AJ_id) === 'true' && !PI_AJ_clicked && button.color === 'green' &&
				/Join|Watch|Spot/.test(button.text);
		if (clickNow && PI_AJ_remember_between_sessions && racingpaneldata.session.sessionid === PI_AJ_clicked_session_id) {
			PI_log('oops we already clicked this session before');
			clickNow = false;
			$(button.object).find('div').text('Sorry, click yourself now');
		}
		else if (clickNow) {
			PI_AJ_clicked = true;

			var clickEl = $(button.object).find('div');
			if (clickEl.length === 0)
				clickEl = $(button.object);
			clickEl.text('Auto clicking in progress');

			PI_log('we have now clicked sessionid' + racingpaneldata.session.sessionid);
            if (PI_AJ_remember_between_sessions) {
                $.cookie(PI_AJ_id + '_session_clicked', racingpaneldata.session.sessionid, {
                    path: '/membersite',
                    expires: 365
                });
                PI_AJ_readClickCookie();
                PI_log('stored previous clicked session in cookie ' + $.cookie(PI_AJ_id + '_session_clicked'));
            }
		}
		else if (/Test Car on Track/.test(button.text)) {
			PI_log('green button test car on track detected, abort cleanup');
			PI_log(button);
			return false;
		}
		PI_log('cleaning up from click()');
		PI_AJ_cleanUp();

		if (clickNow)
			$(button.object).click();

	}

	function PI_AJ_cleanUp() {
		PI_AJ_removeListeners();
		if (!PI_AJ_remember_between_sessions) {
			$.cookie(PI_AJ_id, null, {
				path: '/membersite'
			});
			$(PI_AJ_checkbox).remove();
		}
	}


	function PI_AJ_addCheckbox(button) {
		if (!PI_AJ_checkbox) {
			PI_log('PI_AJ_addCheckbox');
			PI_log('actualy creating and adding it');
			PI_AJ_checkbox = document.createElement('input');
			PI_AJ_checkbox.setAttribute('type', 'checkbox');
			PI_AJ_checkbox.setAttribute('id', PI_AJ_id);

			if (PI_AJ_clicked_session_id === racingpaneldata.session.sessionid) {
				// PI_AJ_checkbox.setAttribute('disabled', 'disabled');
				// PI_AJ_cleanUp();
                PI_log('making checkbox pink now?');
                PI_AJ_checkbox.setAttribute('style', 'border: 1px solid red; background-color: pink');
			}

			if ($.cookie(PI_AJ_id))
				PI_AJ_checkbox.setAttribute('checked', 'checked');

			$(button.object).append(PI_AJ_checkbox);
		} else {
			var buttonVerify = $('#racingpanel_session #piAutoJoin');
			PI_log('button verify length: ' + buttonVerify.length);
		}
	}

	function PI_AJ_readClickCookie() {
        if (PI_AJ_remember_between_sessions) {
            PI_AJ_clicked_session_id = parseInt($.cookie(PI_AJ_id + '_session_clicked') || -1);
            PI_log('restored last session clicked id from cookie' + PI_AJ_clicked_session_id);
        }
	}

	// no race panel sessionstatus, so abort
	if ($('#racingpanel_sessionstatus').length === 0) {
		PI_log('No race panel found, aborting AutoJoin');
		return;
	}

	// why not doc ready?
	$(window).load(function() {
		GM_addStyle('#racingpanel_countdown_timer{right:20px}#' + PI_AJ_id + '{position:absolute;right:0px;top:4px}');
        PI_log('PI-AJ-join load with debug: ', PI_debug);
		PI_AJ_readClickCookie();
		PI_AJ_addEventListeners();
		PI_AJ_handleButton();
	});
}