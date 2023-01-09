#
# 現在地の近所のPOIをリストする
#
alert("Kinjo")

function loadScript (url) {
    return new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = url
        script.onload = resolve
        document.body.appendChild(script)
    })
}
async function loadAll() {
    await loadScript('https://scrapbox.io/api/code/masui/test/test.js')
    alert(data)
}

$(function(){
    loadAll()
})

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
