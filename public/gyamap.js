//
// 現在地の近所のPOIをリストする
// 位置データはFirebase functionで取得
//

// const { listenerCount } = require("process")

var curpos = {
    zoom: 12
} // 地図の中心座標

var locations = [] // POIリスト

var map // GoogleMapsオブジェクト

const blankImage = 'https://i.gyazo.com/a9dd5417ae63c06ccddc2040adbd04af.png' // 空白画像
var selectedImage = blankImage

var locSelected = false // 明示的に選択されたらtrueになる
var clickTime
var state = {} // pushstateで使う

var sortedByTitle = false
var topIndex = 0 // タイトルでソートしたときのトップ行のインデクス

window.addEventListener('popstate', (event) => {
    console.log(event)
    console.log(location + ", state: " + JSON.stringify(event.state))
    location.href = location
})

window.addEventListener('keydown', event => {
  }, /* useCapture= */ false)

$(function () {
    // URL引数の解析
    let args = {}
    document.location.search.substring(1).split('&').forEach((s) => {
        if (s != '') {
            let [name, value] = s.split('=')
            args[name] = decodeURIComponent(value)
        }
    })
    if (args.loc) {
        var match
        match = args.loc.match(/([NS])([\d\.]+),?([EW])([\d\.]+)(,?Z([\d\.]+))?/) // e.g. S35.12E135.12Z13
        console.log(`match=${match}`)
        if (match) {
            curpos.latitude = Number(match[2])
            if (match[1] == 'S') curpos.latitude = -curpos.latitude
            curpos.longitude = Number(match[4])
            if (match[3] == 'W') curpos.longitude = -curpos.longitude
            curpos.zoom = 12
            if (match[6])curpos.zoom = Number(match[6])
        }
        else {
            match = args.loc.match(/(\-?[\d\.]+),(\-?[\d\.]+)(,([\d\.]+))?/) // e.g. 35,135,12
            if (match) {
                curpos.latitude = Number(match[1])
                curpos.longitude = Number(match[2])
                curpos.zoom = 12
                if (match[4]) curpos.zoom = Number(match[4])
            }
        }
    }

    if (curpos.latitude) { // URLで引数が指定されていた場合
        navigator.geolocation.getCurrentPosition(successCallback2, errorCallback) // なぜかこれを入れると動く
    }
    else {
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback);

        console.log("getCurrentPosition()")
    }

    // [/Gyamap] からデータ取得
    let title = 'Gyamap'
    if (args['title']) {
        title = args['title']
    }
    else { // Gyamap.com/逗子八景 みたいなURL
        let match = location.href.match(/\/([^\/]+)$/)
        if (match) {
            title = match[1]
        }
    }

    if (type == 'project') {
        fetch(`/project_entries/${title}`)
            .then((response) => response.text())
            .then((data) => {
                locations = JSON.parse(data)
                locSearchAndDisplay() ///////
                showNearbyImages() // 何故か出ないのはMapのせい?
            })
    }
    else {
        fetch(`/page_entries/${title}`)
            .then((response) => response.text())
            .then((data) => {
                locations = JSON.parse(data)
                locSearchAndDisplay() ///////
                showNearbyImages()
            })
    }

    $(window).keydown(function(e){
        e.preventDefault()
        // 38 が上, 40 が下
        if(e.keyCode == 38 || e.keyCode == 40){
            if(! sortedByTitle){
                sortedByTitle = true
                var curtitle = locations[0].title
                locations.sort((a, b) => {
                    return a.title > b.title ? 1 : -1;
                })
                for(topIndex = 0; locations[topIndex].title != curtitle; topIndex++);
            }
            else {
                if(e.keyCode == 38){
                    if (topIndex > 0) {
                        topIndex -= 1
                    }
                }
                else { // keyCode = 40
                    if (topIndex < locations.length - 1) {
                        topIndex += 1
                    }
                }
            }
            $('#imagelist').empty()
            $('<img>')
                .attr('src', `${locations[topIndex].photo}/raw`)
                .attr('class', 'largeimage')
                .appendTo('#imagelist')
            locSelected = true
            showlists()
            // showNearbyImages()
            map.panTo(new google.maps.LatLng(locations[topIndex].latitude, locations[topIndex].longitude))

            let ind = topIndex
            let locstr = (locations[ind].latitude > 0 ? `N${locations[ind].latitude}` : `S${-locations[ind].latitude}`)
            + (locations[ind].longitude > 0 ? `E${locations[ind].longitude}` : `W${-locations[ind].longitude}`)
            locstr += `Z${map.getZoom()}`
            history.pushState(state, null, `?loc=${locstr}`)
        }
    });
})

// 距離計算
function distance(lat1, lng1, lat2, lng2) {
    const R = Math.PI / 180;
    lat1 *= R; // ラジアンに変換
    lng1 *= R;
    lat2 *= R;
    lng2 *= R;
    return 6371 * Math.acos(Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1) + Math.sin(lat1) * Math.sin(lat2));
}

// 方位角
function angle(lat1, lng1, lat2, lng2) {
    const R = Math.PI / 180;
    lat1 *= R
    lng1 *= R
    lat2 *= R
    lng2 *= R
    let deltax = lng2 - lng1
    let y = Math.sin(deltax)
    let x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(deltax)
    let psi = Math.atan2(y, x) * 180 / Math.PI
    if (psi < 0) psi += 360
    return psi
}

// 方位角を方位名に変える
function direction(angle) {
    if (angle < 22.5) return 'N'
    if (angle < 67.5) return 'NE'
    if (angle < 112.5) return 'E'
    if (angle < 157.5) return 'SE'
    if (angle < 202.5) return 'S'
    if (angle < 247.5) return 'SW'
    if (angle < 292.5) return 'W'
    if (angle < 337.5) return 'NW'
    return 'N'
}

function showNearbyImages() {
    $('#imagelist').empty()
    for (let i = 0; i < 8; i++) {
        let img = $('<img>')
        if(i+topIndex < locations.length){
            img.attr('src', `${locations[i + topIndex].photo}/raw`)
                .attr('class', 'smallimage')
                .attr('title', locations[i + topIndex].title)
                .appendTo('#imagelist')
        }
        img.attr('index', i+topIndex)
        img.click(function (e) {
            topIndex = 0
            sortedByTitle = false
            let ind = $(e.target).attr('index')
            map.panTo(new google.maps.LatLng(locations[ind].latitude, locations[ind].longitude))
            let locstr = (locations[ind].latitude > 0 ? `N${locations[ind].latitude}` : `S${-locations[ind].latitude}`)
            + (locations[ind].longitude > 0 ? `E${locations[ind].longitude}` : `W${-locations[ind].longitude}`)
            // locstr += `Z${locations[ind].zoom}`
            locstr += `Z${map.getZoom()}`
            history.pushState(state, null, `?loc=${locstr}`)

            selectedImage = `${locations[ind].photo}/raw`
            $('#imagelist').empty()
            $('<img>')
                .attr('src', selectedImage)
                .attr('class', 'largeimage')
                .appendTo('#imagelist')
            locSelected = true
            locSearchAndDisplay()
        })
    }
}

function locSearchAndDisplay() {
    //alert('locSearchAndDisp')
    // $('<img>').attr('src',blankImage).attr('height',400).appendTo('#imagelist')
    let mapcenter = map.getCenter();
    curpos.latitude = mapcenter.lat().toFixed(5)
    curpos.longitude = mapcenter.lng().toFixed(5)

    let locstr = (curpos.latitude > 0 ? `N${curpos.latitude}` : `S${-curpos.latitude}`)
    + (curpos.longitude > 0 ? `E${curpos.longitude}` : `W${-curpos.longitude}`)
    locstr += `Z${curpos.zoom}`
    history.pushState(state,null,`?loc=${locstr}`)

    sortByLocation()
    showlists()
}

function initGoogleMaps(lat, lng) {
    console.log("initGoogleMaps()")
    var latlng = new google.maps.LatLng(lat, lng)
    var myOptions = {
        zoom: curpos.zoom,
        center: latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("mapcanvas"), myOptions);
    console.log("map generated")

    // http://sites.google.com/site/gmapsapi3/Home/v3_reference
    google.maps.event.addListener(map, 'dragend', function () {
        topIndex = 0
        sortedByTitle = false
        $('#image').attr('src', blankImage)
        locSelected = false
        locSearchAndDisplay()
        showNearbyImages()
    })

    google.maps.event.addListener(map, 'zoom_changed', function() {
        let loc = locations[topIndex]
        let locstr = (loc.latitude > 0 ? `N${loc.latitude.toFixed(5)}` : `S${-loc.latitude.toFixed(5)}`)
        + (loc.longitude > 0 ? `E${loc.longitude.toFixed(5)}` : `W${-loc.longitude.toFixed(5)}`)
        locstr += `Z${map.getZoom()}`
        console.log(locstr)
        history.pushState(state,null,`?loc=${locstr}`)
    });

    //google.maps.event.addListener(map, 'click', locSearchAndDisplay);
    //google.maps.event.addListener(map, 'zoom_changed', locSearchAndDisplay);
    google.maps.event.addListener(map, 'keydown', function (e) {
        e.preventDefault()
        e.stopPropagation();
    })
}

function sortByLocation(){
    for (var i = 0; i < locations.length; i++) {
        entry = locations[i]
        entry.distance = distance(entry.latitude, entry.longitude, curpos.latitude, curpos.longitude)
    }
    locations.sort((a, b) => { // 近い順にソート
        return a.distance > b.distance ? 1 : -1;
    })
}

var marker = []
function showlists() {
    // console.log(`showlists() - locations = ${locations}`)
    
    $('#list').empty()
    // for (var i = 0; i < 20 && i < locations.length; i++) {
    for (var i = 0; i < 20 && i + topIndex < locations.length; i++) {
        let loc = locations[i + topIndex]
        //let li = $('<li>')
        let li = $('<div>')
        li.css('margin','0px')
        li.css('padding','0px')
        //li.css('display','flex')
        li.addClass(list)
        
        let img = $('<img>')
        let d = direction(angle(curpos.latitude, curpos.longitude, loc.latitude, loc.longitude))
        //img.attr('src', `https://Gyamap.com/move_${d}.png`)
        img.addClass('moveimage')
        //xxximg.css('margin','3px 2px 0px 0px') ///////
        //yyyimg.css('margin','-10px 2px 0px 0px')
        img.css('padding','0px')
        img.attr('src', `/move_${d}.png`)
        img.attr('latitude', loc.latitude.toFixed(5))
        img.attr('longitude', loc.longitude.toFixed(5))
        img.attr('zoom', loc.zoom)
        img.attr('photo', loc.photo)
        img.click(function (e) {
            topIndex = 0
            sortedByTitle = false
            clickTime = Date.now()
            map.panTo(new google.maps.LatLng($(e.target).attr('latitude'), $(e.target).attr('longitude')))
            let locstr = (loc.latitude > 0 ? `N${loc.latitude.toFixed(5)}` : `S${-loc.latitude.toFixed(5)}`)
            + (loc.longitude > 0 ? `E${loc.longitude.toFixed(5)}` : `W${-loc.longitude.toFixed(5)}`)
            locstr += `Z${loc.zoom}`
            history.pushState(state,null,`?loc=${locstr}`)
            
            selectedImage = `${$(e.target).attr('photo')}/raw`
            $('#imagelist').empty()
            $('<img>')
                .attr('src', selectedImage)
                .attr('class', 'largeimage')
                .appendTo('#imagelist')
            curpos.latitude = $(e.target).attr('latitude')
            curpos.longitude = $(e.target).attr('longitude')
            curpos.zoom = map.getZoom()
            locSelected = true
            sortByLocation()
            showlists()
        })
        img.mouseover(function (e) {
            if (Date.now() - clickTime > 500) { // クリック後すぐのmouseoverは無視
                $('#imagelist').empty()
                $('<img>')
                .attr('src', `${$(e.target).attr('photo')}/raw`)
                .attr('class', 'largeimage')
                .appendTo('#imagelist')
            }
        })
        img.mouseleave(function (e) {
            $('#imagelist').empty()
            $('<img>')
                .attr('src', selectedImage)
                .attr('class', 'largeimage')
                .appendTo('#imagelist')
        })
        if (!locSelected || i != 0) {
            li.append(img)
        }

        /*
       $('<span>')
           .text(' ')
           .css('margin', '0px')
           .css('padding', '0px')
           .appendTo(li)
           */

        let e = $('<a>')
            .text(loc.title)
            .attr('href', `https://scrapbox.io/${project}/${loc.title}`)
            .attr('target', '_blank')
        e.attr('photo', loc.photo)
        //xxxe.css('margin','2px 2px 2px 2px')//////
        e.css('margin','0px 2px 0px 2px')
        e.css('padding','0px')
        e.mouseover(function (e) {
            if (Date.now() - clickTime > 500) { // クリック後すぐのmouseoverは無視
                $('#imagelist').empty()
                $('<img>')
                    .attr('src', `${$(e.target).attr('photo')}/raw`)
                    .attr('class', 'largeimage')
                    .appendTo('#imagelist')
            }
        })
        e.mouseleave(function (e) {
            $('#imagelist').empty()
            $('<img>')
                .attr('src', selectedImage)
                .attr('class', 'largeimage')
                .appendTo('#imagelist')
        })
        li.append(e)
        /*
        li.append($('<span>')
            .css('margin','0px')
            .css('padding','0px')
            .text('　'))
            */

        let desc = $("<span>")
            .text(loc.desc)
            //.css('height','16px')
            .css('margin','0px 2px 0px 2px')
            .css('padding','0px')
        li.append(desc)
        
        $('#list').append(li)
    }

    $('#loading1').css('display','none')
    $('#loading2').css('display','none')

    // 地図上にマーカー表示
    //console.log(`locations = ${locations}`)
    console.log(`locations[0] = ${locations[0]}`)
    console.log(locations[0].latitude)

    if(locations.length > 0){
        for(let i=0;i<locations.length;i++){
            if(marker[i]){
                marker[i].setMap(null)
                marker[i] = null
            }
        }
        for(let i=0;i<6 && i+topIndex < locations.length;i++){
            var latlng = new google.maps.LatLng(locations[i+topIndex].latitude, locations[i+topIndex].longitude)
            /*
            if(marker[i+topIndex]){
                marker[i+topIndex].setMap(null)
                marker[i+topIndex] = null
            }
            */
            marker[i+topIndex] = new google.maps.Marker({
                position: latlng
            })
            marker[i+topIndex].setMap(map);
        }
    }
}

function successCallback2(position) {
    mapsurl = "https://maps.google.com/maps?q=" +
    curpos.latitude + "," + curpos.longitude;
    initGoogleMaps(curpos.latitude, curpos.longitude)
    sortByLocation()
    showlists()
    showNearbyImages()
}

function successCallback(position) {
    mapsurl = "https://maps.google.com/maps?q=" +
    position.coords.latitude + "," +
        position.coords.longitude;
    curpos.latitude = position.coords.latitude
    curpos.longitude = position.coords.longitude
    initGoogleMaps(curpos.latitude, curpos.longitude)
    sortByLocation()
    showlists()
    showNearbyImages()
}
function errorCallback(error) {
    var err_msg = "";
    switch (error.code) {
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

    curpos.latitude = 35.02914
    curpos.longitude = 135.75871
    initGoogleMaps(curpos.latitude, curpos.longitude)
    sortByLocation()
    showlists()
    showNearbyImages()
}
