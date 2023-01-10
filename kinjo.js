//
// 現在地の近所のPOIをリストする
//
alert("近所")

function loadScript (url) {
    return new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = url
        script.onload = resolve
        document.body.appendChild(script)
    })
}
async function loadAll() {
    await loadScript('https://scrapbox.io/api/code/masui/POI/poi.js')
}
    
$(function(){
    //loadAll()
    // setTimeout(function(){ alert(data[2]) }, 5000)
    // alert(data[2])
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
for(let i=0; i<data.length; i++){
    let m = data[i].match(/\[\/(.*)\/(.*)\]\s+.*@([\d\.]+),([\d\.]+)/)
    entry = {}
    entry.project = m[1]
    entry.title = m[2]
    entry.latitude = m[3]
    entry.longitude = m[4]
    locations.push(entry)
}
alert(locations.length)

navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
function successCallback(position) {
    mapsurl = "https://maps.google.com/maps?q=" +
        position.coords.latitude + "," +
        position.coords.longitude;
    alert(mapsurl)
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
