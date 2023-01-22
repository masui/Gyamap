//
// [/Kinjo]のデータをリストする
//
var urllist = []
var visited_pages = {} // 同じページを再訪しないように

var project = 'masuimap'

function texturl(title){
    return `https://scrapbox.io/api/pages/${project}/${title}/text`
}

var count = 0

fetch(`https://scrapbox.io/api/pages/${project}`)
    .then((res) => res.json())
    .then((json) => {
	if(json.name == 'NotFoundError'){
	    console.log('Not Found')
	}
	else { // プロジェクト内のページすべてチェック
	    json.pages.forEach((page) => {
		url = texturl(page.title)
		count += 1
		console.log(count)
		fetch(url)
		    .then((res) => res.text())
		    .then((text) => {
			let a = text.split(/\n/)
			for(let i=1;i<a.length;i++){
			    line = a[i]
			    match = line.match(/\[N([\d\.]+),E([\d\.]+),Z([\d\.]+)\]/) // 地図が登録されている場合
			    if(match){
				s = `${page.title} - ${line}`
				if(! urllist.includes(s)){
				    urllist.push(s)
				    console.log(s)
				}
			    }
			    else {
			    }
			}
			count -= 1
			console.log(count)
		    })
	    })
	}
    })
console.log('end')




/*

rooturl = texturl('増井俊之')

(async () => {
    let response = await getlist(rooturl)
    console.log("getlist() end")
    // let user = await response.json();
})()

// getlist(rooturl)
// console.log("getlist() end")

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
		match = line.match(/\[N([\d\.]+),E([\d\.]+),Z([\d\.]+)\]/) // 地図が登録されている場合
		if(match){
		    s = `${title} - ${line}`
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
*/
