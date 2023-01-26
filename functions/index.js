//
// /Gyamap のデータをリストする Firebase function
//

const functions = require('firebase-functions')
//const fetch = require('node-fetch')
 
// Firebaseでexpressを利用
const express = require('express');
//const { data } = require('cypress/types/jquery'); なんじゃこりゃ
const app = express(); // expressを利用! firebase.jsonの設定が大事

// 静的ファイルはこれで提供
// public/favicon.ico などが 以下のapp.get()でマッチしないようになるハズ?
app.use(express.static('public'))

// functions/views/index.ejs を使う
app.set('views', './views')
app.set('view engine', 'ejs')

// Gyamap.com/プロジェクト/page_entries/場所
app.get('/:project/page_entries/:title', (request, response) => { // Gyamap.com/gyamap/page_entries/ツマガリ みたいなアクセス
    datalist = []
    visited_pages = {}
    getlist_page(request.params.project, request.params.title, response)
})

// Gyamap.com/page_entries/場所
app.get('/page_entries/:title', (request, response) => { // Gyamap.com/page_entries/ツマガリ みたいなアクセス
    datalist = []
    visited_pages = {}
    getlist_page('Gyamap', request.params.title, response)
})

app.get('/project_entries/:project', (request, response) => { // プロジェクト名からページのリストを得る
    datalist = []
    visited_pages = {}
    getlist_project(request.params.project, response)
 })

app.get('/:project/:title', (request, response) => { // Gyamap.com/masui/写真 みたいなアクセス
    //datalist = []
    let data = {}
    data.project = request.params.project
    data.title = request.params.title
    data.type = 'page'
    data.pageurl = `https://Scrapbox.io/${request.params.project}/${request.params.name}`
    response.render('index', data)  // views/index.ejs を表示
})

// Gyamap.com/名前
// 名前はプロジェクト名かもしれないしページタイトルかもしれない
// 名前のプロジェクトがあれば、そのプロジェクトの中の全ページを使う
// プロジェクトが無い場合は、/Gyamap/の下のその名前のページを使う
//
app.get('/:name', (request, response) => {
    //datalist = []
    let data = {}
    // name というプロジェクトが有るかどうかで処理を分ける。
    // プロジェクトが存在する場合はプロジェクト内の全ページをチェック
    fetch(`https://scrapbox.io/api/pages/${request.params.name}`)
        .then((response) => response.json())
        .then((json) => {
            if (json.name == 'NotFoundError') { // プロジェクト名でなかった場合
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

var datalist = [] // ブラウザに返すデータ


async function getlist_project(project,res){
    url = `https://scrapbox.io/api/pages/${project}`
    let getlist_res = res
    console.log(`url = ${url}`)
    var response = await fetch(url)
    var json = await response.json()
    console.log(project)
    await Promise.all(json.pages.map(page => fetch(`https://scrapbox.io/api/pages/${project}/${page.title}/text`)
        .then(result => result.text()))
    ).then(results => results.forEach((text) => {
        let desc = ""
        let a = text.split(/\n/)
        //console.log(`a.length = ${a.length}`)
        let title = a[0]
        //console.log(`title = ${title}`)
        let entry = {}
        for (let i = 1; i < a.length; i++) {
            let line = a[i]
            let match = line.match(/(https?:\/\/gyazo\.com\/[0-9a-f]{32})/) // Gyazo画像
            if (match && !entry.photo) {
                entry.photo = match[1]
            }
            else {
                // match = line.match(/\[N([\d\.]+),E([\d\.]+),Z([\d\.]+)\]/) // 地図が登録されている場合
                match = line.match(/\[N([\d\.]+),E([\d\.]+),Z([\d\.]+)(\s+\S+)?\]/) // 地図が登録されている場合
                if (match) {
                    entry.title = title
                    entry.latitude = Number(match[1]) // 西経の処理が必要!!
                    entry.longitude = Number(match[2])
                    entry.zoom = Number(match[3])
                }
                else {
                    if (!line.match(/^\s*$/) && desc == "") {
                        if (!line.match(/\[http/)) {
                            desc = line.replace(/\[/g, '').replace(/\]/g, '')
                        }
                    }
                }
            }
        }
        entry.desc = desc
        if (entry.latitude) {
            datalist.push(entry)
            console.log(`datalist.length = ${datalist.length}`)
        }
    }))
    console.log('end')
    console.log(datalist)
    
    getlist_res.set('Access-Control-Allow-Origin', '*')
    getlist_res.json(datalist)
}

var pending = 0
var wait_res

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

async function getlist_page(project, title, res){
    let url = `https://scrapbox.io/api/pages/${project}/${title}/text`
    if (visited_pages[url]) return
    visited_pages[url] = true

    // Scrapboxデータを再帰的に取得
    pending += 1
    console.log(`pending +1 pending=${pending}`)
    var response = await fetch(url)
    var text = await (response.text())
    let lines = text.split(/\n/)
    let entry = {}
    let desc = ""
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i]
        let match = line.match(/(https?:\/\/gyazo\.com\/[0-9a-f]{32})/) // Gyazo画像
        if (match && !entry.photo) {
            entry.photo = match[1]
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
            getlist_page(project, match[1], null)
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

