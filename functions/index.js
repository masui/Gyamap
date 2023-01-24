//
// /Gyamap のデータをリストするFirebase function
//

const functions = require("firebase-functions")
//const fetch = require('node-fetch')
 
// Firebaseでexpressを利用
const express = require('express');
const app = express(); // expressを利用! firebase.jsonの設定が大事

var project

var urllist = []

// 静的ファイルはこれで提供
// public/favicon.ico などが 以下のapp.get()でマッチしないようになるハズ?
app.use(express.static('public'))

// views/index.ejs を使う
app.set('views', './views')
app.set('view engine', 'ejs')

let data = { // index.ejsに渡すためのデータ
    loc: "現在地",
    project: "Gyamap",
    title: "Gyamap"
}

// Gyamap.com/プロジェクト/page_entries/場所
app.get('/:project/page_entries/:title', (request, response) => { // Gyamap.com/gyamap/page_entries/ツマガリ みたいなアクセス
    datalist = []
    project = request.params.project
    rooturl = texturl(project, request.params.title)
    getlist_page(rooturl, response)
})

// Gyamap.com/page_entries/場所
app.get('/page_entries/:title', (request, response) => { // Gyamap.com/page_entries/ツマガリ みたいなアクセス
    datalist = []
    project = 'Gyamap'
    rooturl = texturl(project, request.params.title)
    getlist_page(rooturl, response)
})

app.get('/project_entries/:project', (request, response) => { // プロジェクト名からページのリストを得る
    console.log(`app = request=${request.params.project}`)
    project = request.params.project
    getlist_project(`https://scrapbox.io/api/pages/${project}`, response)
 })

app.get('/:project/:title', (request, response) => { // Gyamap.com/masui/写真 みたいなアクセス
    data.project = request.params.project
    data.title = request.params.title
    data.type = 'page'
    data.pageurl = `https://Scrapbox.io/${request.params.project}/${request.params.name}`
    response.render('index', data)  // views/index.ejs を表示
})

// Gyamap.com/名前
app.get('/:name', (request, response) => {
    let data = {}
    // name というプロジェクトが有るかどうかで処理を分ける。
    // プロジェクトが存在する場合はプロジェクト内の全ページをチェック
    fetch(`https://scrapbox.io/api/pages/${request.params.name}`)
        .then((response) => response.json())
        .then((json) => {
            if (json.name == 'NotFoundError') {
                data.project = "Gyamap"
                data.title = request.params.name
                data.type = 'page'
                data.pageurl = `https://Scrapbox.io/Gyamp/${request.params.name}`
                response.render('index', data)  // views/index.ejs を表示
            }
            else { // プロジェクト内のページすべてチェック
                fetch(`https://scrapbox.io/api/projects/${request.params.name}`)
                    .then((response) => response.json())
                    .then((json) => {
                        data.project = request.params.name
                        data.title = json.displayName
                        data.type = 'project'
                        data.pageurl = `https://Scrapbox.io/${request.params.name}/`
                        response.render('index', data)  // views/index.ejs を表示
                    })
            }
        })
})

exports.app = functions.https.onRequest(app)

var visited_pages = {} // 同じページを再訪しないように

function texturl(project, title) {
    return `https://scrapbox.io/api/pages/${project}/${title}/text`
}

var datalist = [] // ブラウザに返すデータ

var pending = 0
var wait_res


async function getlist_project(url, res) {
    let rrr = res
    console.log(`url = ${url}`)
    var response = await fetch(url)
    var json = await response.json()
    console.log(project)
    await Promise.all(json.pages.map(page => fetch(`https://scrapbox.io/api/pages/${project}/${page.title}/text`)
    .then(result => result.text()))
    ).then(results => results.forEach((text) => {
        //console.log(text)
        let desc = ""
        let a = text.split(/\n/)
        let title = a[0]
        let entry = {}
        for (let i = 1; i < a.length; i++) {
            let line = a[i]
            let match = line.match(/(https?:\/\/gyazo\.com\/[\0-9a-f]{32})/) // Gyazo画像
            if (match && !entry.photo) {
                entry.photo = match[i]
                continue
            }
            //console.log(line)
            match = line.match(/\[N([\d\.]+),E([\d\.]+),Z([\d\.]+)\]/) // 地図が登録されている場合
            if (match) {
                s = `${title} - ${line}`
                if (!urllist.includes(s)) {
                    urllist.push(s)
                    console.log(`s = ${s}`)
                    
                    entry.title = title
                    entry.latitude = Number(match[1]) // 西経の処理が必要!!
                    entry.longitude = Number(match[2])
                    entry.zoom = Number(match[3])
                    continue
                }
            }
            if (!line.match(/^\s*$/) && desc == "") {
                if (!line.match(/\[http/)) {
                    desc = line.replace(/\[/g, '').replace(/\]/g, '')
                }
            }
            else {
            }
        }
        entry.desc = desc
        if (entry.latitude) {
            datalist.push(entry)
        }
        //console.log(`urllist = ${urllist}`)
    }))
    console.log('end')
    rrr.set('Access-Control-Allow-Origin', '*')
    rrr.json(datalist)
}

function wait_pending() {
    console.log(`wait_pending() - pending=${pending}`)
    if (pending == 0) {
        wait_res.set('Access-Control-Allow-Origin', '*')
        wait_res.json(datalist)
    }
    else {
        setTimeout(wait_pending, 1000)
    }
}

async function getlist_page(url, res) {
    if (visited_pages[url]) return
    visited_pages[url] = true

    // Scrapboxデータを取得
    pending += 1
    console.log(`pending +1 pending=${pending}`)
    var response = await fetch(url)
    var text = await (response.text())
    let lines = text.split(/\n/)
    let title = lines[0]
    let entry = {}
    let desc = ""
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i]
        let match = line.match(/(https?:\/\/gyazo\.com\/[\0-9a-f]{32})/) // Gyazo画像
        if (match && !entry.photo) {
            entry.photo = match[i]
            continue
        }
        match = line.match(/\[(N([\d\.]+),E([\d\.]+),Z([\d\.]+))\]/) // 地図が登録されている場合
        if (match) {
            entry.title = title
            entry.latitude = Number(match[2]) // 西経の処理が必要!!
            entry.longitude = Number(match[3])
            entry.zoom = Number(match[4])
            continue
        }
        if (!line.match(/^\s*$/) && desc == "") {
            if (!line.match(/\[http/)) {
                desc = line.replace(/\[/g, '').replace(/\]/g, '')
            }
        }
        match = line.match(/\[([^\[\]]*)\]/)
        if (match) {
            getlist_page(texturl(project, match[1]), null)
            continue
        }
    }
    entry.desc = desc
    if (entry.latitude) {
        datalist.push(entry)
    }
    pending -= 1
    console.log(`pending -1 pending=${pending}`)

    if (res) {
        wait_res = res
        wait_pending()
    }
}

