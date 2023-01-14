const functions = require("firebase-functions");
const fetch = require('node-fetch');

// // Create and deploy your first functions
// // https://firebase.google.com/docs/functions/get-started
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

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

exports.helloWorld = functions.https.onRequest((request, response) => {
    // /helloWorld というURLでアクセスできる
    /*
    fetch('https://example.com/')
    	.then((response) => response.json())
    	.then((data) => response.send('xxxxx'))
    */
    /*
    fetch('https://scrapbox.io/api/pages/Kinjo/%E8%A1%A3%E5%BC%B5%E5%B1%B1/text')
	.then((response) => response.text())
	.then((data) => response.send(data))
    */
    fetch('https://scrapbox.io/api/pages/Kinjo/%E8%A1%A3%E5%BC%B5%E5%B1%B1/text')
	.then((res) => res.text())
	.then((data) => {
	    // CORSを許す
	    response.set('Access-Control-Allow-Origin', 'https://masui-kinjo-95209.web.app')
	    response.send(data)
	})
    // response.set('Access-Control-Allow-Origin', 'https://masui-kinjo-95209.web.app/')
    // response.send("Hello from Firebase!");
    //return data
    
    //response.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST'); // DELETEだけは拒否
    //response.set('Access-Control-Allow-Headers', 'Content-Type'); // Content-Typeのみを許可
});



//
// [/Kinjo]のデータをリストする
//
var urllist = []
var visited_pages = {} // 同じページを再訪しないように

function texturl(pagetitle){
    return `https://scrapbox.io/api/pages/Kinjo/${pagetitle}/text`
}

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

async function xxxx(url){
    let response = await getlist(url)
}

exports.POI = functions.https.onRequest((request, response) => {
    rooturl = texturl(request.query.name)
    getlist(rooturl)

    
    //response.send(request.query.name)
    // CORSを許す
    //response.set('Access-Control-Allow-Origin', 'https://masui-kinjo-95209.web.app')
    response.set('Access-Control-Allow-Origin', '*')
    response.send(urllist.join('\n'))
})
