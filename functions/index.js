//
// [/kinjo]のデータをリストするFirebase function
//

const functions = require("firebase-functions");
const fetch = require('node-fetch');

var visited_pages = {} // 同じページを再訪しないように

function texturl(pagetitle){
    return `https://scrapbox.io/api/pages/Kinjo/${pagetitle}/text`
}

var datalist = [] // ブラウザに返すデータ
async function getlist(url){
    if(visited_pages[url]) return
    visited_pages[url] = true

    // Scrapboxデータを取得
    await fetch(url)
	.then((res) => res.text())
	.then((text) => {
	    let a = text.split(/\n/)
	    let title = a[0]
	    for(let i=1;i<a.length;i++){
		line = a[i]
		match = line.match(/\[(N([\d\.]+),E([\d\.]+),Z([\d\.]+))\]/) // 地図が登録されている場合
		if(match){
		    let entry = {}
		    entry = {}
		    entry.project = 'Kinjo'
		    entry.title = title
		    entry.latitude = Number(match[2]) // 西経の処理が必要!!
		    entry.longitude = Number(match[3])
		    entry.zoom = Number(match[4])
		    datalist.push(entry)
		}
		else {
		    match = line.match(/\[(.*)\]/)
		    if(match){
			getlist(texturl(match[1]))
		    }
		}
	    }
	})
}

exports.POI = functions.https.onRequest((request, response) => {
    rooturl = texturl(request.query.name)
    getlist(rooturl)

    // CORSを許す
    response.set('Access-Control-Allow-Origin', '*')
    response.json(datalist)
})
