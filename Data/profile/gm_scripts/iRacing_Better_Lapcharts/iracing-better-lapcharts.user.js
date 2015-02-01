// ==UserScript==
// @name			iRacing Better Lapcharts
// @version			0.1
// @copyright		2013, Paul Ilbrink
// @namespace		http://www.paulilbrink.nl/userscripts
// @description		This script add's better interactive lapcharts to race result pages
// @match			http://mmmembers.iracing.com/membersite/member/EventResult.do*
// @match			http://offline.paulilbrink.nl/iracing/lapchart/
// @grant       none
// ==/UserScript==

var load,execute,loadAndExecute,executeJQuery;
load=function(a,b,c){
	var d;
	d=document.createElement("script"),
	d.setAttribute("src",a),
	b!=null&&d.addEventListener("load",b),
	c!=null&&d.addEventListener("error",c),
	document.body.appendChild(d);
	return d
	},execute=function(a){
	var b,c;
	typeof a=="function"?b="("+a+")();":b=a,c=document.createElement("script"),c.textContent=b,document.body.appendChild(c);
	return c
	},loadAndExecute=function(a,b){
	return load(a,function(){
		return execute(b)
		})
	}
,executeJQuery=function(a){
	if(typeof jQuery=='undefined'){
		var jqUrl='//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js';
		loadAndExecute(jqUrl,a);
	}else{
		execute(a);
	}
};

execute(function(){
	var PI_BLC_debug = true;
	var PI_BLC_version = 0.1;

	function log(msg, forceLog) {
		forceLog = forceLog || false;

		if ((PI_BLC_debug || forceLog) && typeof console != 'undefined')
			console.log(msg);
	}

	function PI_BLC_init() {
		log('init');
		jQuery(document).ready(function(){
			if (eventtypename == 'Race') {
				PI_BLC_setupStyles();
				PI_BLC_setupHtml();
				PI_BLC_setupScripts();
				PI_BLC_wait();
			}
		});
	}

	function PI_BLC_getLapchartLink() {
		return jQuery('a.default_red_link:contains("View Lap Chart")');
	}

	function PI_BLC_setupStyles() {
		log('styles');
		var h = document.getElementsByTagName('head')[0];
		var l = document.createElement('link');
		l.rel = 'stylesheet';
		l.type = 'text/css';
		l.href = '//cdnjs.cloudflare.com/ajax/libs/fancybox/2.1.4/jquery.fancybox.css';
		h.appendChild(l);
		jQuery(h).append('<style type=text/css>#betterLapCharts{display:block}</style>');
	}

	function PI_BLC_setupScripts() {
		log('scripts');
		var h = document.getElementsByTagName('head')[0];
		var s = document.createElement('script');
		s.type = 'text/javascript';
		s.src = '//cdnjs.cloudflare.com/ajax/libs/fancybox/2.1.4/jquery.fancybox.pack.js';
		h.appendChild(s);

		s = document.createElement('script');
		s.type = 'text/javascript';
		s.src = 'http://offline.paulilbrink.nl/iracing/lapchart/iracing-better-lapcharts.jquery.js';
		h.appendChild(s);
	}

	function PI_BLC_setupHtml() {
		log('html');
		// add link
		var linkDiv = PI_BLC_getLapchartLink().parent();
		var separator = jQuery(linkDiv).find('span:first').clone();
		var link = jQuery(linkDiv).find('a:first').clone().attr('href', '#betterLapCharts').text('View Better Lapcharts');
		linkDiv.append(separator).append(link);

		// add hidden fancybox div
		jQuery('body').append('<div id=betterLapCharts><h2>Better Lap Charts</h2><div class=chart></div></div>');
	}


	function PI_BLC_jq_functions_loaded() {
		var functions = ['fancybox', 'lapchart'];
		var success = true;
		for (var i = 0; i < functions.length; i++) {
			var fnName = 'jQuery.' + functions[i];
			if (eval('typeof ' + fnName) !== 'function'
				&& eval('typeof ' + fnName.replace('jQuery', 'jQuery.fn')) !== 'function') {
				log(fnName + ' not defined as function');
				success = false;
				break;
			}
		}
		return success;
	}

	function PI_BLC_wait(attemptsLeft) {
		log('wait');
		attemptsLeft = typeof attemptsLeft != 'undefined' ? parseInt(attemptsLeft) : 5;

		if (PI_BLC_jq_functions_loaded()) {
			PI_BLC_run();
		} else {
			log('wait some more, ' + attemptsLeft);
			if (attemptsLeft > 0) {
				setTimeout(function(){
					PI_BLC_wait(--attemptsLeft);
				}, 500);
			}
		}
	}

	function PI_BLC_setupLapchart() {
		log('setup lapchart');
		jQuery('#betterLapCharts .chart').lapchart({
			data: PI_BLC_getLapchartData()
		});
	}

	function PI_BLC_getLapchartData() {
		var url = (PI_BLC_debug ? 'lapchart.php?url=' : '') + contextpath + '/member/GetLapChart';
		var data = {
			subsessionid: subsessionid,
			carclassid: carClassId
		}
		jQuery.ajax({
			url: url,
			data: data,
			error: function(xhr, status, err) {
				log('error retrieving lapchart data')
				return {};
			},
			success: function(data, status, xhr) {
				log('successfully retrieved lapchart data');
				log(data);
				return data;
			}
		})
	}

	function PI_BLC_run() {
		log('run');
		jQuery('a[href="#betterLapCharts"]').fancybox({
			beforeLoad: PI_BLC_setupLapchart
		});
	}

	PI_BLC_init();
});