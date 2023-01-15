//
// 現在地の近所のPOIをリストする
// 位置データはFirebase functionで取得
//

var curpos = {}
var curzoom = 10

var locations = [] // POIリスト
    
var map // GoogleMapsオブジェクト

$(function(){
    // URL引数の解析
    let args = {}
    document.location.search.substring(1).split('&').forEach((s) => {
        if(s != ''){
            let [name, value] = s.split('=')
            args[name] = decodeURIComponent(value)
        }
    })

    if(args['loc']){
	var match = args['loc'].match(/[NS]([\d\.]*),[EW]([\d\.]*),Z(.*)/)
	if(match){
	    curpos.latitude = Number(match[1])
	    curpos.longitude = Number(match[2])
	    curpos.zoom = Number(match[3])
	}
    }
    if(curpos.latitude){
	initGoogleMaps(curpos.latitude,curpos.longitude)
	showlists()
    }
    else {
	navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
    }

    // [/Kinjo] からデータ取得
    let name = '増井俊之'
    if(args['name']){
	name = args['name']
    }
    fetch(`https://us-central1-masui-kinjo-95209.cloudfunctions.net/POI?name=${name}`)
	.then((response) => response.text())
	.then((data) => {
	    locations = JSON.parse(data)
	    locSearchAndDisplay()
	})
})

function distance(lat1, lng1, lat2, lng2) {
    const R = Math.PI / 180;
    lat1 *= R;
    lng1 *= R;
    lat2 *= R;
    lng2 *= R;
    return 6371 * Math.acos(Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1) + Math.sin(lat1) * Math.sin(lat2));
}

function locSearchAndDisplay(){
    var center = map.getCenter();
    curpos.latitude = center.lat()
    curpos.longitude = center.lng()
    showlists()
}

function initGoogleMaps(lat,lng){
    var latlng = new google.maps.LatLng(lat,lng)
    var myOptions = {
      zoom: 14,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);

    // http://sites.google.com/site/gmapsapi3/Home/v3_reference
    google.maps.event.addListener(map, 'dragend', locSearchAndDisplay);
    //google.maps.event.addListener(map, 'click', locSearchAndDisplay);
    //google.maps.event.addListener(map, 'zoom_changed', locSearchAndDisplay);
}

function showlists(){
    for(var i=0;i<locations.length;i++){
	entry = locations[i]
	entry.distance = distance(entry.latitude,entry.longitude,curpos.latitude,curpos.longitude)
    }
    locations.sort((a, b) => { // 近い順にソート
	return a.distance > b.distance ? 1 : -1;
    });

    $('#list').empty()
    for(var i=0;i<10 && i<locations.length;i++){
	let loc = locations[i]
	let li = $('<li>')
	let e = $('<a>')
	e.text(loc.title)
	e.attr('href',`https://scrapbox.io/Kinjo/${loc.title}`)
	li.append(e)
	li.append($('<span>').text(' '))
	
	let img = $('<img>')
	img.attr('src','https://s3-ap-northeast-1.amazonaws.com/masui.org/8/0/802bd7347668cae0bafec4f5d52e247d.png')
	img.attr('height','14px')
	img.attr('latitude',loc.latitude)
	img.attr('longitude',loc.longitude)
	img.attr('zoom',loc.zoom)
	img.latitude = 10000
	img.click(function(e){
	    //console.log(e.type)
	    //console.log(e.target)
	    //console.log($(e.target).attr('latitude'))
	    map.panTo(new google.maps.LatLng($(e.target).attr('latitude'),$(e.target).attr('longitude')))

	    curpos.latitude = $(e.target).attr('latitude')
	    curpos.longitude = $(e.target).attr('longitude')
	    showlists()
	})
	/*
	let map = $('<a>')
	map.attr('href',`https://www.google.com/maps/@${loc.latitude},${loc.longitude},${loc.zoom}z`)
	map.append(img)
	li.append(map)
	*/
	li.append(img)
	
	$('#list').append(li)
    }
}

function successCallback(position) {
    mapsurl = "https://maps.google.com/maps?q=" +
        position.coords.latitude + "," +
        position.coords.longitude;
    curpos.latitude = position.coords.latitude
    curpos.longitude = position.coords.longitude
    initGoogleMaps(curpos.latitude,curpos.longitude)
    showlists()
}
function errorCallback(error) {
    var err_msg = "";
    switch(error.code)
    {
        case 1:
        err_msg = "位置情報の利用が許可されていません";
        break;
        case 2:
        err_msg = "デバイスの位置が判定できません";
        break;
        case 3:
        err_msg = "タイムアウトしました";
        break;
    }
    alert(err_msg)
    //document.getElementById("show_result").innerHTML = err_msg;
}
