const functions = require("firebase-functions");
const fetch = require('node-fetch');

// Take the text parameter passed to this HTTP endpoint and insert it into 
// Firestore under the path /messages/:documentId/original
exports.addMessage = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  // Push the new message into Firestore using the Firebase Admin SDK.
  const writeResult = await admin.firestore().collection('messages').add({original: original});
  // Send back a message that we've successfully written the message
  res.json({result: `Message with ID: ${writeResult.id} added.`});
});

//
// [/kinjo]のデータをリストする
//
var urllist = []
var visited_pages = {} // 同じページを再訪しないように

function texturl(pagetitle){
    return `https://scrapbox.io/api/pages/Kinjo/${pagetitle}/text`
}

var datalist = [] // ブラウザに返すデータ
async function getlist(url){
    if(visited_pages[url]) return
    visited_pages[url] = true

    await fetch(url)
	.then((res) => res.text())
	.then((text) => {
	    let a = text.split(/\n/)
	    let title = a[0]
	    for(let i=1;i<a.length;i++){
		line = a[i]
		match = line.match(/\[(N([\d\.]+),E([\d\.]+),Z([\d\.]+))\]/) // 地図が登録されている場合
		if(match){
		    s = `${title}\t${match[1]}`
		    if(! urllist.includes(s)){
			urllist.push(s)
			console.log(s)
		    }
		    let entry = {}
		    entry = {}
		    entry.project = 'Kinjo'
		    entry.title = title
		    entry.latitude = Number(match[2])
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
    //response.set('Access-Control-Allow-Origin', 'https://masui-kinjo-95209.web.app')
    response.set('Access-Control-Allow-Origin', '*')
    response.json(datalist)
})
