//
// /kinjo のデータをリストするFirebase function
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
    let lines = text.split(/\n/)
    let title = lines[0]
    let entry = {}
    for(let i=1;i<lines.length;i++){
	line = lines[i]
	let match = line.match(/(https?:\/\/gyazo\.com\/[\0-9a-f]{32})/) // Gyazo画像
	if(match && !entry.photo){
	    entry.photo = match[i]
	    continue
	}
	match = line.match(/\[(N([\d\.]+),E([\d\.]+),Z([\d\.]+))\]/) // 地図が登録されている場合
	if(match){
	    entry.title = title
	    entry.latitude = Number(match[2]) // 西経の処理が必要!!
	    entry.longitude = Number(match[3])
	    entry.zoom = Number(match[4])
	    continue
	}
	match = line.match(/\[([^\[\]]*)\]/)
	if(match){
	    getlist(texturl(match[1]),null)
	    continue
	}
    }
    if(entry.latitude){
	datalist.push(entry)
    }
    pending -= 1

    if(res){
	wait_res = res
	wait_pending()
    }
}
    
exports.POI = functions.https.onRequest((request, response) => {
    datalist = []

    rooturl = texturl(request.query.name) // URL?name=abc からabcを取得
    getlist(rooturl,response)
})
