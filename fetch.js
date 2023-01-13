rootpage = '増井俊之'
rooturl = `https://scrapbox.io/api/pages/Kinjo/${rootpage}/text`

var urllist = []
var visited_pages = {}

function getlist(url){
    // 同じページを再訪しないように
    if(visited_pages[url]) return
    visited_pages[url] = true

    fetch(url)
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
			getlist(`https://scrapbox.io/api/pages/Kinjo/${match[1]}/text`)
		    }
		}
	    }
	})
}

getlist(rooturl)
