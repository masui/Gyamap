//
// [/kinjo]のデータをリストするFirebase function
//

const functions = require("firebase-functions");
//const fetch = require('node-fetch');

var visited_pages = {} // 同じページを再訪しないように

function texturl(pagetitle){
    return `https://scrapbox.io/api/pages/Kinjo/${pagetitle}/text`
}

var datalist = [] // ブラウザに返すデータ

var pending = 0
var wait_res

function wait_pending(){
    if(pending == 0){
	wait_res.set('Access-Control-Allow-Origin', '*')
	wait_res.json(datalist)
    }
    else {
	setTimeout(wait_pending,1000)
    }
}

async function getlist(url,res){
    if(visited_pages[url]) return
    visited_pages[url] = true

    // Scrapboxデータを取得
    pending += 1
    var response = await fetch(url)
    var text = await(response.text())
    let a = text.split(/\n/)
    let title = a[0]
    let entry = {}
    let match
    for(let i=1;i<a.length;i++){
	line = a[i]
	match = line.match(/(https?:\/\/gyazo\.com\/[\0-9a-f]{32})/) // Gyazo画像
	if(match && !entry.photo){
	    entry.photo = match[i]
	    break
	}
	match = line.match(/\[(N([\d\.]+),E([\d\.]+),Z([\d\.]+))\]/) // 地図が登録されている場合
	if(match){
	    // entry.project = 'Kinjo'
	    entry.title = title
	    entry.latitude = Number(match[2]) // 西経の処理が必要!!
	    entry.longitude = Number(match[3])
	    entry.zoom = Number(match[4])
	    break
	}
	match = line.match(/\[([^\[\]]*)\]/)
	if(match){
	    getlist(texturl(match[1]),null)
	    break
	}
    }
    if(entry.latitude){
	datalist.push(entry)
    }
    pending -= 1

    if(res){
	wait_res = res
	wait_pending()
	//res.set('Access-Control-Allow-Origin', '*')
	//res.json(datalist)
    }
}
    
exports.POI = functions.https.onRequest((request, response) => {
    datalist = []

    rooturl = texturl(request.query.name)
    getlist(rooturl,response)

    /*
    // CORSを許す
    response.set('Access-Control-Allow-Origin', '*')
    // JSONデータをブラウザに返す
    datalist = [1,2,3]
    response.json(datalist)
    */
})
