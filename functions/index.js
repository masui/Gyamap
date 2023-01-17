//
// /kinjo のデータをリストするFirebase function
//

const functions = require("firebase-functions");
//const fetch = require('node-fetch');
const express = require('express');

const app = express(); // expressを利用! firebase.jsonの設定が大事

//app.engine('hbs', engines.handlebars);
//app.set('views', './views');
//app.set('view engine', 'hbs');

app.set('views', './views');
app.set('view engine', 'ejs');


app.get('/info/*', (request, response) => { // Gyamap.com/info/ツマガリ みたいなアクセス
    datalist = []
    rooturl = texturl(request.params[0])
    getlist(rooturl,response)
    // response.send(request.params);
})
app.get('/*', (request, response) => { // Gyamap.com/逗子八景 みたいなアクセス
    // response.send(request.params[0] + "xxxxx")
    response.render('index');
})

// exports.app = functions.https.onRequest((req, res) => {

//exports.app = functions.https.onRequest((app) => {
//    app.get('/api', (request, response) => {
//	response.send("API");
//    })
//    /*
//    app.get('/*', (request, response) => {
//	response.send(request.params[0] + "xxxxx")
//    })
//    */
//});

exports.app = functions.https.onRequest(app);

//exports.app = functions.https.onRequest((req, res) => {
//    //console.log(req.url)
//    var param = req.params[0]
//    res.send(param)
//
//    /*
//    datalist = []
//    //rooturl = texturl(request.query.name) // URL?name=abc からabcを取得
//    rooturl = texturl(param)
//    getlist(rooturl,res)
//    */
//})

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
    let desc = ""
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
	if(!line.match(/^\s*$/) && desc == ""){
	    if(!line.match(/\[http/)){
		desc = line.replace(/\[/g,'').replace(/\]/g,'')
	    }
	}
	match = line.match(/\[([^\[\]]*)\]/)
	if(match){
	    getlist(texturl(match[1]),null)
	    continue
	}
    }
    entry.desc = desc
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
