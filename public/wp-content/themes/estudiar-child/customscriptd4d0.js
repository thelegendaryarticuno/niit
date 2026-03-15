jQuery(document).ready(function() {

	posts_load_more = '#load-more-button-post';
	faculty_search_form = "#faculty-search-form";
	href = jQuery('.elementor-pagination .page-numbers.next',posts_load_more).attr('href');
	location_list = '#form-field-location_select_box';
	$=jQuery;
	faculy_detail_form = ".faculty-search-form";

	jQuery('.elementor-pagination .page-numbers',posts_load_more).hide();
   	jQuery('.elementor-pagination',posts_load_more).append('<button class="post-load-more" data-href="'+href+'"><span>Load More</span></button>');

	if(!href) {
		jQuery('.post-load-more',posts_load_more).hide();
	}

	
	jQuery(document).on('click','#load-more-button-post .post-load-more', function() {
		url = jQuery(this).attr('data-href');
		jQuery('#load-more-button-post .post-load-more span').text('Loading').parent().addClass('loading')
		load_more_posts(url, false);        
	})


	// fill location form list
	if(jQuery(location_list).length > 0 && window.location_list) {
		let response = window.location_terms;
		var options = '';
		for(var i in response) {
			let name = response[i].name.replace(/\d+\./g, "");
			options+='<option value="'+response[i].term_id+'">'+name+'</option>';
		}
		jQuery(location_list).append(options)
	}

	function set_search_in_load_more() {
		var location = jQuery('select',faculty_search_form).val()
		var keyword = jQuery('input[type="text"]',faculty_search_form).val()
		params = {'location':location, 'keyword':keyword};

		if(location == "" && keyword.length < 3) return

		
		href = jQuery('.post-load-more').attr('data-href');

		if(!href) {
			href = window.location.href;
		}

		query_str = new URLSearchParams(params).toString()
		jQuery(".post-load-more").attr('data-href',href+'?'+query_str);
		return href+'?'+query_str;
	}

	function load_more_posts(url, replace_posts, callback) {
		var jqxhr = jQuery.get( url, function(data) {
			html  = jQuery(data);
			posts = html.find('.elementor-posts-container', posts_load_more).html();
			load_more_link = html.find('.elementor-pagination .page-numbers.next',posts_load_more).attr('href');
			
			if(replace_posts) {
				
				if(!posts) {
					posts = '<div class="no-content">No data available.</div>'
				}
				
				jQuery('.elementor-posts-container',posts_load_more).html(posts);
			}
			else {
				jQuery('.elementor-posts-container',posts_load_more).append(posts);
			}
			
			$('body').trigger('loadmore:append');

			jQuery('.post-load-more',posts_load_more).attr('data-href',load_more_link);
			jQuery('.post-load-more',posts_load_more).show();
			if(!load_more_link) {
				jQuery('.post-load-more',posts_load_more).hide();
			}

			set_search_in_load_more()
			$(document).trigger('loadMoreDone');
			if(callback) {
				callback(data)
			}

		})
		.fail(function(data) {
			console.log(data);
			alert( "something went wrong Please try again." );
		})
		.always(function() {
			jQuery('#load-more-button-post .post-load-more span').text('Load more').parent().removeClass('loading')
			jQuery('#search-faculty-btn').removeClass('loading');
		});
	}
	
	
	/* Faculty list page */
	let faculty_list_container = '.faculty-list';
	let faculty_list = {};
	let faculty_list_clicked_load_more = false;
	let default_area_to_show = '58';
	
	setTimeout(function() {
		// set query string vars in form
		var query_vars = get_query_string();
		var scroll = false;
		if(query_vars.keyword) {
			var scroll = true;
			$('input[type="text"]',faculty_search_form).val(query_vars.keyword).trigger('change')
		}

		if(query_vars.location) {
			var scroll = true;
			$('select',faculty_search_form).val(query_vars.location).trigger('change')
		}
		
		if(scroll && jQuery('#our-faculty-form').length > 0) {
			$('html, body').animate({
				scrollTop: jQuery('#our-faculty-form').offset().top
			}, 1000);
		}
		
		jQuery('#search-faculty-btn').attr('type','button').off('click');
		jQuery('form',faculty_search_form).addClass('elementor-form-waiting');
	}, 1000);

	if(window.faculty_list) {
		faculty_list = window.faculty_list;
		render_faculty(faculty_list);
	}
	
	function get_faculty_list() {
		jQuery.ajax({
			url: ecs_ajax_params.ajaxurl,
			type: "POST",
			data: {action: "faculty-list"},
			dataType: 'json',
			success: function(response) {
				$(faculty_list_container).addClass('loaded');
				response.faculty.sort((a, b) => {
					let a_name = remove_ignore_words(a.post_title);
					let b_name = remove_ignore_words(b.post_title);
					return (a_name > b_name) ? 1 : -1
				})
				faculty_list = response;
				render_faculty(faculty_list);
			}
		});
	}
	
	function get_full_faculty_list(faculty_list) {
		let list_html = "";
		let filtered_area = $('#form-field-location_select_box').val();
		let search = $('#form-field-keyword').val();
		let is_filtered = false;
		
		if(!faculty_list_clicked_load_more) {
			$('#load-more-faculty').show();
		}
		
		if(search || filtered_area) {
			$('#load-more-faculty').hide();
		}
		
		faculty_list.area.forEach(function(val, index) {
			
			// ignore area which is not selcted
			if(filtered_area != '' && filtered_area != val.term_id.toString()) {
				return;
			}
			
			// show only 1st type of faculty without load more click
			if(!faculty_list_clicked_load_more &&  default_area_to_show != val.term_id.toString() && filtered_area == '' && search =='') {
				return;
			}
			
			let faculties = get_area_wise_faculty(val.term_id,faculty_list.faculty, search);
			let area_html = '';
			
			if(faculties.length == 0) {
				return;
			}
			
			faculties.sort(function(a, b) {
				let a_name = remove_ignore_words(a.post_title)
				let b_name = remove_ignore_words(b.post_title)
				return a_name.toLowerCase() > b_name.toLowerCase() ? 1 : -1
			});
			
			faculties.forEach(function(row, index) {
				area_html+=get_single_faculty_html(row);
			});
			
			let name = val.name.replace(/\d+\./g, "");
			
			area_html = `<div class="elementor-grid-6 elementor-grid"><div class="elementor-grid">${area_html}</div></div>`;
			list_html+=`<h4>${name}</h4>`;
			list_html+=area_html;
			
		});
		return list_html;
	}
	
	function get_area_wise_faculty(area_id, faculty_list, search_keyword = '') {
		let return_array = [];
		
		faculty_list.forEach(function(val, index) {
			let name = remove_ignore_words(val.post_title);
			if(search_keyword!='' && name.toLowerCase().indexOf(search_keyword.toLowerCase()) == -1) {
				return;
			}
			
			if(val.area.toString() == area_id.toString()) {
				return_array.push(val);
			}
		});
		
		return return_array;
	}
	
	function remove_ignore_words(str) {
		let ignore_words = ['Mr','Dr', 'Prof', 'Ms'];
		return str.replace(new RegExp('\\b(' + ignore_words.join("|") + ')\\b', 'gi'), '')
				.replace(/\s{2,}/g, '').trim();
	}
	
	function get_single_faculty_html(faculty){
		html=`<div class="elementor-grid-item">
			<a href="${faculty.link}" target="_blank">
				<img src="${faculty.image}">
				<h6>${faculty.post_title}</h6>
				<div class="designation">${faculty.designation}</div>
			</a>
		</div>`;
		return html;
	}
	
	function search_faculty_by_name() {
		render_faculty(faculty_list);
	}
	
	function render_faculty(faculty_list) {
		let html = get_full_faculty_list(faculty_list)
		
		let items = $(html).find('.elementor-grid-item').length;
		
		if(items < 1) {
			html='<div class="no-result"><h4>No result found.</h4></div>'
		}
		
		$(faculty_list_container).html(html);
	}
	
	jQuery(document).on('change','#form-field-location_select_box', function() {
		render_faculty(faculty_list);
	});
	
	jQuery(document).on('click','#load-more-faculty', function() {
		faculty_list_clicked_load_more = true;
		$('#load-more-faculty').hide();
		render_faculty(faculty_list);
	});
	
	var typingTimer;
	jQuery(document).on('keyup','#form-field-keyword', function() {
		clearTimeout(typingTimer);
		typingTimer = setTimeout(search_faculty_by_name, 500);
	});
	
	/******************** End Faculty list page */
	
	
	
	/** Faculty detail page*/
	var action = ecs_ajax_params.ajaxurl
	var search_result_uri = '/about-us/nu-faculty'
	$('button',faculy_detail_form).unbind();
	$('input[type="hidden"]',faculy_detail_form).remove();
	$('select[name="form_fields[location_select_box]"]').attr('name','location')
	$('input[name="form_fields[search_keyword]"]').attr('name','keyword')
	$('.faculty-search-form form').addClass('elementor-form-waiting')
	
	setTimeout(function() {
		$('form',faculy_detail_form).attr('action',custom_vars.siteurl+search_result_uri).attr('method','get').unbind();
		$('button',faculy_detail_form).attr('type','submit')
	}, 2000)
	
	/******** Faculty detail page end*/
	
	
	/** Latest@nu media page*/
	var post_media_container = '.posts-media-list';
	var media_filter_form = "#mediafilterbydate";
	var filter_media_action = custom_vars.siteurl+'/latest-at-nu/media'
	var query_vars = get_query_string();
	if(query_vars.type) {
		query_vars.type = query_vars.type.replace("+", " ");
		$('#form-field-media_type',media_filter_form).val(query_vars.type)
	}
	
	if(query_vars.after) {
		$('#form-field-from_date',media_filter_form).val(query_vars.after)
	}
	
	if(query_vars.before) {
		$('#form-field-to_date',media_filter_form).val(query_vars.before)
	}
	
	var filter_media_button = $('.elementor-field-type-submit', media_filter_form).html();
	hide_media_list_extra_title();
	$(document).on('loadmore:append','body', function() {
		hide_media_list_extra_title();
	})
	
	setTimeout(function() {
		$('input[type="hidden"]', media_filter_form).remove();
		$('button',media_filter_form).unbind();
		$(media_filter_form).unbind();
		$(media_filter_form).attr('action',filter_media_action).attr('method','get');
		$('input[type="hidden"]',media_filter_form).remove();
		$('#form-field-from_date', media_filter_form).attr('name','after')
		$('#form-field-to_date',media_filter_form).attr('name','before')
		$('#form-field-media_type',media_filter_form).attr('name','type')
		$('#search-media-btn', media_filter_form).remove();
		$('.elementor-field-type-submit').html(filter_media_button);
		$(document).trigger('loadMoreDone');
	}, 2000);
	
	$(document).on('loadMoreDone', function(e, eventInfo) {
		if($(media_filter_form).lenght < 1) return;
	
		href = jQuery('.post-load-more').attr('data-href');
		if(!href) {
			href = window.location.href;
		}
		
		// remove query string
		if(href.indexOf("?") >= 0 ) {
			href = href.substring(0, href.indexOf("?"))
		}
		
		href+=window.location.search;
		
		jQuery(".post-load-more").attr('data-href',href);
		return href;
	});
	
	
	
	function hide_media_list_extra_title() {
		//$('.media-link-file, .media-link-external, .media-link-post', post_media_container).hide();
		$('article',post_media_container).each(function() {
			var href = $('.media-link-post a', this).attr('href');
			if($('.media-link-file a', this).length > 0) {
				href = $('.media-link-file a', this).attr('href');
			}
			else if($('.media-link-external a', this).length > 0) {
				href = $('.media-link-external a', this).attr('href')
				$('.media-link-post a', this).attr('target', '_blank');
			}
			
			$('.media-link-post a', this).attr('href', href);
		});
	}
	
	/********************* Latest@nu media page*/
	/****** Read More Button script start*******/
	jQuery(".contentreadmore").hide();
		jQuery(".show_hide").on("click", function () {
			jQuery(this).next('.contentreadmore').show(500);
			jQuery(this).hide(50);
	});
	/****** Read More Button script End*******/
	
	/*********************** In picture page *********************/
	
	jQuery(document).on('click','.gallery-item', function() {
		setTimeout(function() {
			add_swiper_index();
		}, 500);
	});

	function add_swiper_index() {

		jQuery('.swiper-container').each(function() {
			let ele_class = "sliding-index";
			jQuery('.'+ele_class,this).remove();
			jQuery(this).append('<div class="'+ele_class+'"></div>');
			let swiper = this.swiper
			let parent = swiper.el;
			let total = jQuery('.swiper-slide').length
			let duplicate = jQuery('.swiper-slide-duplicate').length
			jQuery('.'+ele_class, parent).html((swiper.realIndex+1)+'/'+(total-duplicate))
			
			append_title(swiper);

			swiper.on('slideChange', function () {
				let total = jQuery('.swiper-slide', this.el).length
				let duplicate = jQuery('.swiper-slide-duplicate', this.el).length
				jQuery('.'+ele_class, this.el).html((this.realIndex+1)+'/'+(total-duplicate))

				setTimeout(function() {
					pagination_center(this);
				}, 1000)
			});

			swiper.on('afterInit', function () {
				let total = jQuery('.swiper-slide').length
				let duplicate = jQuery('.swiper-slide-duplicate', this.el).length

				jQuery('.'+ele_class, this.el).html((this.realIndex+1)+'/'+(total-duplicate))
				append_title();
				pagination_center(this);
			});
		});
	}


	function append_title(swiper) {
		$('.swiper-slide a', swiper.el).each(function() {
			let title = $(this).attr('title');
			if(title) {
				$(this).attr('title','');
				$('.caption', this).remove();					
				//$(this).append('<div class="caption">'+title+"</div>")
				
			}
		});
	}

	function pagination_center(swiper) {
		jQuery('.swiper-pagination .swiper-pagination-bullet',swiper.el).hide();
		let active_index = jQuery('.swiper-pagination .swiper-pagination-bullet-active',swiper.el).index();
		let active_start=0;
		let active_end=5;

		if(active_index >= 5) {
			active_start = active_index - 4;
			active_end = active_index;
		}

		for (let i = active_start; i <= active_end; i++) {
			jQuery('.swiper-pagination .swiper-pagination-bullet',swiper.el).eq(i).show()
		}
	}
	
	/*********************** In picture end *********************/
	
	
	/***** Header  ***/
	setTimeout(function() {
		jQuery("#menu-main-navigation-desktop .elementor-tab-title a").click(function(e) {
			e.stopPropagation();
		});
	}, 2000);
	
	$(document).on('click','.search-popup-action', function() {
		setTimeout(function() {
			$('#popup-search-keyword input[type="search"]').focus();
		}, 200);
	});
	
	/***** End Header  ***/
	
	jQuery(document).on( 'elementor/popup/show', () => {
		jQuery('body').addClass('elementor-popup-visible');
	} );
	
	jQuery(document).on( 'elementor/popup/hide', () => {
		jQuery('body').removeClass('elementor-popup-visible');
	} );
	
	
	var c, currentScrollTop = 0,
       navbar = $('.ekit-template-content-header');

   $(window).scroll(function () {
      var a = $(window).scrollTop();
      var b = navbar.height();
     
      currentScrollTop = a;
     
      if (c < currentScrollTop && a > b + b) {
        navbar.addClass("scrollUp");
      } else if (c > currentScrollTop && !(a <= b)) {
        navbar.removeClass("scrollUp");
      }
      c = currentScrollTop;
  });

});


function get_query_string(){
	var vars = [], hash;
	var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	for(var i = 0; i < hashes.length; i++)
	{
		hash = hashes[i].split('=');
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}
	return vars;
}



const scrollUp = "scroll-up";
const scrollDown = "scroll-down";
let lastScroll = 0;
let initialScrollClass = 'scrolled-initial';
let initialScroll = 150;
window.addEventListener("scroll", () => {
const currentScroll = window.pageYOffset;
	
	if(currentScroll > initialScroll && !jQuery('body').hasClass(initialScrollClass)) {
		jQuery('body').addClass(initialScrollClass)
	}
	else if(currentScroll <= initialScroll && jQuery('body').hasClass(initialScrollClass)) {
		jQuery('body').removeClass(initialScrollClass)
	}
	
body = document.body
if (currentScroll <= 0) {
	body.classList.remove(scrollUp);
	return;
}

if (currentScroll > lastScroll && !body.classList.contains(scrollDown)) {
	// down
	body.classList.remove(scrollUp);
	body.classList.add(scrollDown);
} else if (
	currentScroll < lastScroll &&
	body.classList.contains(scrollDown)
) {
	// up
	body.classList.remove(scrollDown);
	body.classList.add(scrollUp);
}
lastScroll = currentScroll;
});

jQuery(document).ready(function() {
//explore this section
		active_text=jQuery('h1.elementor-heading-title').text().trim();
		jQuery(".js-sub-nav-list li").each(function(){
		current_text=jQuery(this).children().last().text().trim();
		if(active_text==current_text){
				jQuery(this).addClass("active");
		}
		});

//read more first caps rest small
		jQuery(".show_hide").each(function(){
			var lower_case_sent= $(this).text().toLowerCase().trim();
			var conv_text=lower_case_sent.charAt(0).toUpperCase()+lower_case_sent.substr(1).toLowerCase();
			jQuery(this).html('<span>'+conv_text+'</span>');
		
		});

//explore this page start

jQuery(window).scroll(function(){
	if (jQuery(window).scrollTop() >= 0) {
		jQuery('.explore-sticky-section').addClass('fixed-explore');
	}
	else {
		jQuery('.explore-sticky-section').removeClass('fixed-explore');
	}
});
	
jQuery(document).on('click','#explore-page .sub_nav_list li a',function(event){
	event.stopPropagation();
	jQuery("#explore-page .elementor-tab-title").removeClass('elementor-active');
	jQuery("#explore-page .elementor-tab-content").removeClass('elementor-active');
	jQuery("#explore-page .elementor-tab-content").hide();
	var $root = jQuery('html, body');  
	
	var href = jQuery.attr(this, 'href');
	$root.animate({
		scrollTop: jQuery(href).offset().top - 90
	}, 1000, function () {
		window.location.hash = href;
	});         
	return false;
	
	
});

//explore this page end

jQuery(document).ready(function() {
	ptabPar=jQuery(".elementor-tab-title.elementor-tab-mobile-title.elementor-active");
	ptabPar.attr('class','elementor-tab-title elementor-tab-mobile-title elementor-active tab-active');
	jQuery(ptabPar).next('.elementor-tab-content:first').attr('class','elementor-tab-content elementor-clearfix elementor-active tab-content-active');

});


	jQuery(document).on("click",".elementor-tab-title.elementor-tab-mobile-title.elementor-active",function(event){
	event.stopPropagation();
	self=this;
			if (jQuery(self).hasClass("tab-active")) {
				jQuery(self).attr('class','elementor-tab-title elementor-tab-mobile-title');
				jQuery(self).next('.elementor-tab-content:first').attr('class','elementor-tab-content elementor-clearfix tab-content-nonactive');
			}else{
				jQuery(self).attr('class','elementor-tab-title elementor-tab-mobile-title elementor-active tab-active');
				jQuery(self).next('.elementor-tab-content:first').attr('class','elementor-tab-content elementor-clearfix elementor-active tab-content-active');

			}
});

// table-accordian 
jQuery(document).on("click",".table-accordian .elementor-toggle-item",function(event){

	acSibs=$(this).siblings('.elementor-toggle-item');

	acSibs.each(function(e){
		tabTitle=$(this).children('.elementor-tab-title');
		tabTitle.attr('aria-hidden','false');
		tabTitle.removeClass('elementor-active');
		tabTitle.attr('aria-expanded','false');
		tabTitle.removeAttr('aria-selected');

		
	
		tabContent=tabTitle.siblings('.elementor-tab-content').first();
		
		tabContent.removeClass("elementor-active");
		tabContent.hide();

	
	});
	$(this)[0].scrollIntoView();
	
});

jQuery(document).on('click','.closeLandscapeConatiner', function() {
    jQuery('.landscapeConatiner').attr('style','display:none;');
});	
// // swiper-wrapper
// var $swiperSelector = jQuery('.swiper-container');
// $swiperSelector.append(' <div class="swiper-scrollbar"></div>');
// var swiper = new Swiper('.swiper-container', {
// 	scrollbar: {
// 	  el: '.swiper-scrollbar',
// 	  hide: false,
// 	  draggable: true,
// 	},
//   });



/***  Custom Swiper slideer  JS *****/
// jQuery(document).ready(function( $ ){

//   jQuery('.customSwiper_slide .swiper-container').append('<div class="swiper-scrollbar"></div>'); 
  
//     var swiper = new Swiper('.customSwiper_slide .swiper-container', {
//         scrollbar: {
//             el: '.swiper-scrollbar',
//             hide: false,
//             draggable: true,
//           },
//           slidesPerView: 3,
//           breakpoints: {
//             // when window width is >= 320px
//             320: {
//               slidesPerView: 1,
           
//             },
//             // when window width is >= 480px
//             480: {
//               slidesPerView: 1,
             
//             },
//             // when window width is >= 640px
//             640: {
//               slidesPerView: 3,
             
//             }
//           }
//         });
  
//   });
//   
//   
$('#scroll-top').hide();     
$(document).scroll(function() {
   
    if ($(window).scrollTop() > $(".page-wrapper").height()/2) {
        $('#scroll-top').fadeIn();
      } else {
        $('#scroll-top').fadeOut();
        
      }
	

	
  });
	
	
	if(jQuery('.page-id-1001489').length > 0 ) {
		jQuery('article.elementor-post a').attr('target', '_blank');
	};
	
		$(".digits").on("keypress",function(event){	
			var inputValue = event.which;
			var value = $(this).val();
			//console.log(value.length);
                if (value.length > 0 && !/^[6-9]/.test(value)) {
                    //console.log(inputValue);
                     $('.digits').val('');
					$(this).val('');
                    event.preventDefault();
                }
			 else if(event.which < 48 || event.which > 57) {
				event.preventDefault();
			}
		});
	
	$('.lettersonly').on("keypress",function(event){
        
        var inputValue = event.which;
		var ename = $('[name=en_name]').val();
		
		   if ($.trim(ename).length === 0 || ename.startsWith(' ')) {
				   $('[name=en_name]').val($('[name=en_name]').val().trimStart());
		   }
		   if (/\s\s/.test(ename)) {
				$('[name=en_name]').val(ename.replace(/\s\s/g, ' '));				
		   }
		
		   if(inputValue == 32){
			   
		   }
          else if (!(inputValue >= 65 && inputValue <= 90) && !(inputValue >= 97 && inputValue <= 122)) {
            event.preventDefault();
          }
        
    });
	//$('.wpcf7-submit').on('click', function() {
                //$('.wpcf7-form').hide();
    // });
   
	
	//Validation
	//
		$('.wpcf7-submit').click(function(e) {
			
			var cf7_state = $('.cf7-state').val();
			var cf7_city = $('.cf7-city').val();
 			var cf7_menu = $('.cf7-menu').val();
			var cf7_submenu = $('.cf7-submenu').val();
			var wpcf7_captchar = $('[name=captcha-170]').val();

			$(".error").remove();
			
			 if (cf7_state.length <= 1) {
				 e.preventDefault();
      			 $('.cf7-state').after('<span class="error wpcf7-not-valid-tip" aria-hidden="true">Please Select State</span>');
			}else{
				$(".error").remove();
			}
			if (cf7_city.length <= 1) {
				 e.preventDefault();
      			 $('.cf7-city').after('<span class="error wpcf7-not-valid-tip" aria-hidden="true">Please Select City</span>');			
			 }else{
				$(".error").remove();
			}
// 			if (cf7_menu.length <= 1) {
// 				 e.preventDefault();
//       			 $('.cf7-menu').after('<span class="error wpcf7-not-valid-tip">This field is required</span>');			
// 			 }else{
// 				$(".error").remove();
// 			}
 			if(cf7_menu == 'BBA'){
				var bba = $('[name=menu-bba]').val();
				if(bba == 'Select Specialization *'){
					$('.cf7-submenu').after('<span class="error wpcf7-not-valid-tip">This field is required</span>');
					e.preventDefault();
				}				
			}
			if(cf7_menu == 'iMBA'){
				var imba = $('[name=menu-imba]').val();
				if(imba == 'Select Specialization *'){
					$('.cf7-submenu').after('<span class="error wpcf7-not-valid-tip">This field is required</span>');
					e.preventDefault();
				}				
			}
			if(cf7_menu == 'M.Tech.'){
				var mtech = $('[name=menu-mtech]').val();
				if(mtech == 'Select Specialization *'){
					$('.cf7-submenu').after('<span class="error wpcf7-not-valid-tip">This field is required</span>');
					e.preventDefault();
				}				
			}
			if(cf7_menu == 'PGDBRM'){
				var pgdbm = $('[name=menu-pgdbrm]').val();
				if(pgdbm == 'Select Specialization *'){
					$('.cf7-submenu').after('<span class="error wpcf7-not-valid-tip">This field is required</span>');
					e.preventDefault();
				}				
			}
			if(cf7_menu == 'PGDBS'){
				var pgdbs = $('[name=menu-pgdbs]').val();
				if(pgdbs == 'Select Specialization *'){
					$('.cf7-submenu').after('<span class="error wpcf7-not-valid-tip">This field is required</span>');
					e.preventDefault();
				}				
			}
			if(cf7_menu == 'PhD'){
				var phd = $('[name=menu-phd]').val();
				if(phd == 'Select Specialization *'){
					$('.cf7-submenu').after('<span class="error wpcf7-not-valid-tip">This field is required</span>');
					e.preventDefault();
				}				
			}
			
// 			if (wpcf7_captchar.length <= 1) {
// 				 e.preventDefault();
//       			 $('.wpcf7-captchar').after('<span class="error wpcf7-not-valid-tip">This field is required</span>');			
// 			 }else{
// 				$(".error").remove();
// 			}

			
		});
	
	$('#form-field-name').on("keypress",function(event){
      const textInput = document.getElementById('form-field-name');
        textInput.addEventListener('input', function(event) {
            const cleanedValue = event.target.value.replace(/[^a-zA-Z\s]/g, '');
            event.target.value = cleanedValue;
        });        
    });
	
	$('#form-field-city').on("keypress",function(event){ 
      const textInputa = document.getElementById('form-field-city');
        textInputa.addEventListener('input', function(event) {
            const cleanedValuea = event.target.value.replace(/[^a-zA-Z\s]/g, '');
            event.target.value = cleanedValuea;
        });        
    });
/*	$('#form-field-mobile').on("keypress",function(event){
      const numberInput = document.getElementById('form-field-mobile');
        numberInput.addEventListener('input', function(event) {           
            const cleanedValue = event.target.value.replace(/[^0-9]/g, '');
            event.target.value = cleanedValue;
        });        
    });
	*/
	
	$('#form-field-mobile').on('keypress', function(e) {
const keyCode = e.which || e.keyCode;
const char = String.fromCharCode(keyCode);

// Allow only digits (0-9)
if (char < '0' || char > '9') {
	e.preventDefault();
	return;
}
const currentValue = $(this).val();
const newValue = currentValue + char;

if (newValue.length > 10) {
	e.preventDefault();
   // $('#error_phone').text('Please enter exactly 10 digits.');
	$('#form-field-mobile').text('');
	return;
}

if (newValue[0] <= '5') {                    
	e.preventDefault();
	$('#form-field-mobile').text('');
	//$('#error_phone').text('The first digit must be greater than 6.');
	return;
}
//$('#error_phone').text('');
}); 
	  jQuery(document).on('click','#submitaskus', function() {
	    //ask me form message change
		const form = document.getElementById('ask_us_form');
		const nameInput = document.getElementById('form-field-name');
        const emailInput = document.getElementById('form-field-email');
        const stateInput = document.getElementById('form-field-state');
		const cityInput = document.getElementById('form-field-city');
		const iamInput = document.getElementById('form-field-i_am');
		const helpInput = document.getElementById('form-field-help_text');

        // Customize message when input is invalid
        nameInput.addEventListener('invalid', function() {
            nameInput.setCustomValidity("Please enter full name.");
        });
        	
	 	emailInput.addEventListener('invalid', function() {
            emailInput.setCustomValidity("Please enter a valid email address.");
        });
		stateInput.addEventListener('invalid', function() {
            stateInput.setCustomValidity("Please select state.");
        });
		cityInput.addEventListener('invalid', function() {
            cityInput.setCustomValidity("Please enter city.");
        });
		iamInput.addEventListener('invalid', function() {
            iamInput.setCustomValidity("Please select a value.");
        });

		helpInput.addEventListener('invalid', function() {
            helpInput.setCustomValidity("Please enter help message.");
        });
	
        // Clear custom validity message when user changes input
        form.addEventListener('input', function() {
			nameInput.setCustomValidity('');
            emailInput.setCustomValidity('');
            stateInput.setCustomValidity('');
			cityInput.setCustomValidity('');
			iamInput.setCustomValidity('');
			helpInput.setCustomValidity('');
        });
	
	
	});
	
	const inputsearchElement = document.getElementById('elementor-search-form-de7e2d7');
	inputsearchElement.setAttribute('required', 'required');
	
	
	 jQuery('.elementskit-submenu-indicator').click(function() {
            jQuery(this).toggleClass('active');
        });
	
	$(".elementor-toggle-title").click(function() {
    if ($(this).hasClass('elementor-active')) {
      $(this).removeClass('elementor-active');
	  $(this).siblings('.elementor-tab-content').slideUp(1000);
    } else {
	  $('.elementor-tab-content').slideUp(1000);   
      $('.elementor-tab-title').removeClass('elementor-active');
      
	  $(this).addClass('elementor-active');
	  $(this).siblings('.elementor-tab-content').slideDown(1000);
	}
  });
	
	$(".elementor-toggle-icon-closed").click(function() {
    if ($(this).hasClass('elementor-active')) {
      $(this).removeClass('elementor-active');
	  $(this).siblings('.elementor-tab-content').slideUp(1000);
    } else {
	  $('.elementor-tab-content').slideUp(1000);   
      $('.elementor-tab-title').removeClass('elementor-active');
      
	  $(this).addClass('elementor-active');
	  $(this).siblings('.elementor-tab-content').slideDown(1000);
	}
  });
	
	
	
	 
});


