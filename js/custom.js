var _____WB$wombat$assign$function_____ = function(name) {return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name)) || self[name]; };
if (!self.__WB_pmw) { self.__WB_pmw = function(obj) { this.__WB_source = obj; return this; } }
{
  let window = _____WB$wombat$assign$function_____("window");
  let self = _____WB$wombat$assign$function_____("self");
  let document = _____WB$wombat$assign$function_____("document");
  let location = _____WB$wombat$assign$function_____("location");
  let top = _____WB$wombat$assign$function_____("top");
  let parent = _____WB$wombat$assign$function_____("parent");
  let frames = _____WB$wombat$assign$function_____("frames");
  let opener = _____WB$wombat$assign$function_____("opener");

jQuery(document).ready(function($){

	//Main menu
	$('#main-menu').smartmenus();
	
	//Mobile menu toggle
	$('.navbar-toggle').click(function(){
		$('.region-primary-menu').slideToggle();
	});

	//Mobile dropdown menu
	if ( $(window).width() < 767) {
		$(".region-primary-menu li a:not(.has-submenu)").click(function () {
			$('.region-primary-menu').hide();
		});
	}
	
	//var reflowDelay = false;
	var reflowHandler = function () {
		var reflowItems = ["#parallax-item-1","#parallax-item-2","#parallax-item-3","#parallax-item-4"];
		for(var i=0;i<reflowItems.length;i++) {
			var ri = document.querySelector(reflowItems[i]);
			if(ri) {
				var riClone = ri.cloneNode(true);
				ri.parentNode.replaceChild(riClone,ri);
			}
		}
		attachCustomEvents();
	};
	window.addEventListener('orientationchange',reflowHandler);
	window.addEventListener('resize',reflowHandler);
	var attachCustomEvents = function() {
		var focusers = document.querySelectorAll('*[data-focus-id]'),
			scrollDelay = 1000,
			focuserClickHandler = function(e){
				var el = e.target,
					focusTarget = el.getAttribute('data-focus-id'),
					maxLoops = 100,i=0;
				while(!focusTarget && i < maxLoops) {
					//console.log("el",el);
					el = el.parentElement;
					focusTarget = el.getAttribute('data-focus-id');
					i++;
				}
				//console.log("event",e);
				//console.log("focus target",'#'+focusTarget);
				console.log("focus target",document.querySelector('#'+el.getAttribute('data-focus-id')));
				if(!iOS())
					window.setTimeout("var el = document.querySelector('#"+el.getAttribute('data-focus-id')+"'),ev = new MouseEvent('click', {'view': window,'bubbles': false,'cancelable': false}),ev2 = new MouseEvent('touch', {'view': window,'bubbles': false,'cancelable': false});el.dispatchEvent(ev);el.dispatchEvent(ev2);",scrollDelay+150);
				else {
					var el = document.querySelector('#'+el.getAttribute('data-focus-id')),
						ev = new MouseEvent('click', {'view': window,'bubbles': false,'cancelable': false}),
						ev2 = new MouseEvent('touch', {'view': window,'bubbles': false,'cancelable': false})
					;
					el.dispatchEvent(ev);
					el.dispatchEvent(ev2);
				}
			},
			focuserFocusGiver = function(e){e.target.focus();console.log("focused!");};
		for(var i=0;i<focusers.length;i++) {
			var el = focusers[i];
			//	ios doesn't give focus with a timeout.
			//el.addEventListener('click',function(){window.setTimeout("document.querySelector('#"+el.getAttribute('data-focus-id')+"').focus();",scrollDelay)});
			//	so let's add it in two steps with the event scope defined.
			el.addEventListener('click',focuserClickHandler);
			document.querySelector('#'+el.getAttribute('data-focus-id')).addEventListener('click',focuserFocusGiver);
		}
		
		$(function() {
			$(window,'a[href*="#"]:not([href="#"])').off('.lukecustom');
			//	Smooth scrolling
			$('a[href*="#"]:not([href="#"])').on('click.lukecustom',function() {
				if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
					var target = $(this.hash);
					target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
					if (target.length) {
						$('html, body').animate({
							scrollTop: target.offset().top - 25
						}, scrollDelay);
						return false;
					}
				}
			});
			//	End Smooth scrolling
			//	Parallax stuffs
			var parallaxItemDefs = [
				{
					selector:'#parallax-item-1',
					scalar:0.5
				}/*,{
					selector:'#parallax-item-2',
					scalar:2
				}*/,{
					selector:'#parallax-item-3',
					scalar:1
				}/*,{
					selector:'#parallax-item-4',
					scalar:5
				},{
					selector:'#parallax-item-5',
					scalar:2
				}*/
			];
			for(var i=0;i<parallaxItemDefs.length;i++) {
				var $el = $(parallaxItemDefs[i].selector)/*,
					bpo = $(parallaxItemDefs[i].selector).css("background-position").split(" "),
					bp = parseFloat(bpo[1]) || 0,
					bpUnit = bpo[1].replace(/\d/g,""),
					bpFull = '50% '+(bp)+bpUnit
				;
				$el.data("parallaxItems.bp",bp);
				$el.data("parallaxItems.bpUnit",bpUnit)*/;
				//$el.css("background-position",bpFull);
				$el.css("top",'0px');
				//console.log('loading bpy',$el,bpo,bp,$el.data("parallaxItems.bp"));
			}
			$(window).on('scroll.lukecustom',function( e ){
				var t = e.delegateTarget;
				for(var i=0;i<parallaxItemDefs.length;i++) {
					var $el = $(parallaxItemDefs[i].selector)/*,
						bp = $el.data("parallaxItems.bp"),
						bpUnit = $el.data("parallaxItems.bpUnit"),
						s = parallaxItemDefs[i].scalar,
						bpNew = parseFloat(bp)-t.scrollY,
						bpFull = '50% '+bpNew+bpUnit
					;
					//console.log("numbers",bp,s,bpNew,bpFull)*/;
					//$el.css("background-position",bpFull);	//	parallaxItemDefs[i].scalar
					$el.css("top",-1*t.scrollY*parallaxItemDefs[i].scalar+'px');	//	parallaxItemDefs[i].scalar
					//console.log("scroll event!"+parallaxItemDefs[i].selector,bpFull);
				}
			});
			//	End Parallax stuffs
		});
	};
	reflowHandler();
});

function iOS() {
	var iDevices = [
		'iPad Simulator',
		'iPhone Simulator',
		'iPod Simulator',
		'iPad',
		'iPhone',
		'iPod'
	];
	if (!!navigator.platform) {
		while (iDevices.length) {
			if (navigator.platform === iDevices.pop()){ return true; }
		}
	}
	return false;
}

}
/*
     FILE ARCHIVED ON 07:16:30 Jan 21, 2019 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 17:32:19 Feb 13, 2024.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  exclusion.robots: 0.147
  exclusion.robots.policy: 0.136
  cdx.remote: 0.103
  esindex: 0.01
  LoadShardBlock: 416.353 (6)
  PetaboxLoader3.datanode: 290.092 (7)
  load_resource: 305.21
  PetaboxLoader3.resolve: 143.135
*/