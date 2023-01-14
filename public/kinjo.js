//
// 現在地の近所のPOIをリストする
//


// Firebase経由でデータを取得!
//var fetcheddata
/*
fetch('https://us-central1-masui-kinjo-95209.cloudfunctions.net/POI?name=増井俊之')
    .then((response) => response.text())
    .then((data) => {
	fetcheddata = data
	setlocations()
    })
*/

var curlatitude = null
var curlongitude = null
var curzoom = 10

$(function(){
    // setTimeout(function(){ alert(data[2]) }, 5000)
    // alert(data[2])
    //initGoogleMaps()

    let args = {}
    document.location.search.substring(1).split('&').forEach((s) => {
        if(s != ''){
            let [name, value] = s.split('=')
            args[name] = decodeURIComponent(value)
        }
    })

    var url = 'https://scrapbox.io/api/code/masui/POI/poi.js'
    if(args['url']){
	url = args['url']
    }

    let name = '増井俊之'
    if(args['name']){
	name = args['name']
    }
    fetch(`https://us-central1-masui-kinjo-95209.cloudfunctions.net/POI?name=${name}`)
	  .then((response) => response.text())
	  .then((data) => {
	      //fetcheddata = data
	      setlocations(data)
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

var locations = []
function setlocations___(){
    for(let i=0; i<data.length; i++){
	let m = data[i].match(/\[\/(.*)\/(.*)\]\s+.*@([\d\.]+),([\d\.]+),(\d+)z/)
	entry = {}
	entry.project = m[1]
	entry.title = m[2]
	entry.latitude = m[3]
	entry.longitude = m[4]
	entry.zoom = m[5]
	locations.push(entry)
    }
}

function setlocations_____(data){
    var a = data.split(/\n/)
    for(let i=0;i<a.length;i++){
	let title, loc
	[title,loc] = a[i].split(/\t/)
	let lon,lat,zoom
	[lat,lon,zoom] = loc.split(/,/)
	let m,v
	m = lat.match(/^(.)(.*)$/)
	v = Number(m[2])
	lat = v
	if(m[1] == 'S') lat = -v
	m = lon.match(/^(.)(.*)$/)
	v = Number(m[2])
	lon = v
	if(m[1] == 'W') lon = -v
	m = zoom.match(/^(.)(.*)$/)
	zoom = Number(m[2])
	entry = {}
	entry.project = "Kinjo"
	entry.title = title
	entry.latitude = lat
	entry.longitude = lon
	entry.zoom = zoom
	locations.push(entry)
    }
}
function setlocations(data){
    locations = JSON.parse(data)
}
    
function locSearchAndDisplay(){
    var center = map.getCenter();
    curlatitude = center.lat()
    curlongitude = center.lng()
    calc()
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

    // setlocations()
}

function calc(){
    for(var i=0;i<locations.length;i++){
	entry = locations[i]
	entry.distance = distance(entry.latitude,entry.longitude,curlatitude,curlongitude)
    }
    locations.sort((a, b) => { // 近い順にソート
	return a.distance > b.distance ? 1 : -1;
    });
    // alert(locations[0].distance)
    $('#list').empty()
    for(var i=0;i<10 && i<locations.length;i++){
	let loc = locations[i]
	let li = $('<li>')
	let e = $('<a>')
	e.text(loc.title)
	e.attr('href',`https://scrapbox.io/${loc.project}/${loc.title}`)
	li.append(e)
	li.append($('<span>').text(' '))
	
	let img = $('<img>')
	img.attr('src','https://s3-ap-northeast-1.amazonaws.com/masui.org/8/0/802bd7347668cae0bafec4f5d52e247d.png')
	img.attr('height','14px')
	let map = $('<a>')
	//map.text('map')
	map.attr('href',`https://www.google.com/maps/@${loc.latitude},${loc.longitude},${loc.zoom}z`)
	map.append(img)
	li.append(map)
	$('#list').append(li)
    }
}

navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
function successCallback(position) {
    mapsurl = "https://maps.google.com/maps?q=" +
        position.coords.latitude + "," +
        position.coords.longitude;
    curlatitude = position.coords.latitude
    curlongitude = position.coords.longitude
    initGoogleMaps(curlatitude,curlongitude)
    calc()
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
