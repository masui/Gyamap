//
// /Gyamap のデータをリストするFirebase function
//

const functions = require("firebase-functions");
//const fetch = require('node-fetch');


// Firebaseでexpressを利用
const express = require('express');
const app = express(); // expressを利用! firebase.jsonの設定が大事

var project;

// 静的ファイルはこれで提供
app.use(express.static('public'));

// views/index.ejs を使う
app.set('views', './views');
app.set('view engine', 'ejs');

let data = {
    loc: "現在地",
    project: "Gyamap",
    title: "Gyamap"
}

// Gyamap.com/プロジェクト/info/場所
app.get('/:project/info/:title', (request, response) => { // Gyamap.com/info/ツマガリ みたいなアクセス
    datalist = []
    project = request.params.project
    rooturl = texturl(project,request.params.title)
    getlist(rooturl,response)
})

// Gyamap.com/info/場所
app.get('/info/:title', (request, response) => { // Gyamap.com/info/ツマガリ みたいなアクセス
    datalist = []
    project = 'Gyamap'
    rooturl = texturl(project,request.params.title)
    getlist(rooturl,response)
})

//app.get('/*/favicon.ico', (request, response) => {
//    response.sendFile(__dirname + '/../public/favicon.ico');
//})
//app.get('/*/gyamap.js', (request, response) => {
//    response.sendFile(__dirname + '/../public/favicon.ico');
//})
    
app.get('/:project/:title', (request, response) => { // Gyamap.com/masui/写真 みたいなアクセス
    data.project = request.params.project
    data.title = request.params.title
    response.render('index',data)  // views/index.ejs を表示
})

// Gyamap.com/名前
app.get('/:title', (request, response) => { // Gyamap.com/逗子八景 みたいなアクセス
    data.project = "Gyamap"
    data.title = request.params.title
    // if(data.desc == "") data.desc = "Gyamap"
    response.render('index',data)  // views/index.ejs を表示
})

exports.app = functions.https.onRequest(app)
/*
exports.app = functions
    .runWith({
      // Ensure the function has enough memory and time
      // to process large files
      timeoutSeconds: 300,
      memory: "1GB",
    })
    .storage.object()
    .onFinalize((object) => {
      // Do some complicated things that take a lot of memory and time
    })
    .https.onRequest(app)
*/

var visited_pages = {} // 同じページを再訪しないように

function texturl(project,title){
    return `https://scrapbox.io/api/pages/${project}/${title}/text`
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
    console.log(`pending +1 pending=${pending}`)
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
	    getlist(texturl(project,match[1]),null)
	    continue
	}
    }
    entry.desc = desc
    if(entry.latitude){
	datalist.push(entry)
    }
    pending -= 1
    console.log(`pending -1 pending=${pending}`)

    if(res){
	wait_res = res
	wait_pending()
    }
}
