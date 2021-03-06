// ==UserScript==
// @name         Bangumi Related Subject Enhance
// @namespace    https://github.com/bangumi/scripts/liaune
// @version      0.6.1
// @description  显示条目页面关联条目的收藏情况,显示关联条目的排名，单行本设为全部已读/取消全部已读
// @author       Liaune
// @include     /^https?:\/\/((bangumi|bgm)\.tv|chii.in)\/subject\/\d+$/
// @grant        GM_addStyle
// ==/UserScript==
(function() {
    GM_addStyle(`
.relate_rank{
padding: 2px 5px 1px 5px;
background: #b4b020;
color: #FFF;
-webkit-box-shadow: 0 1px 2px #EEE,inset 0 1px 1px #FFF;
-moz-box-shadow: 0 1px 2px #EEE,inset 0 1px 1px #FFF;
box-shadow: 0 1px 2px #EEE,inset 0 1px 1px #FFF;
-moz-border-radius: 4px;
-webkit-border-radius: 4px;
border-radius: 4px
}
.relate_rank_1{
padding: 2px 5px 1px 5px;
background: #15d7b3;
color: #FFF;
-webkit-box-shadow: 0 1px 2px #EEE,inset 0 1px 1px #FFF;
-moz-box-shadow: 0 1px 2px #EEE,inset 0 1px 1px #FFF;
box-shadow: 0 1px 2px #EEE,inset 0 1px 1px #FFF;
-moz-border-radius: 4px;
-webkit-border-radius: 4px;
border-radius: 4px
}
.relate_wish{
border-color: #fd59a9;
border-style: solid;
border-width:2px;
border-radius: 4px
}
.relate_collect{
border-color: #3838e6;
border-style: solid;
border-width:2px;
border-radius: 4px
}
.relate_do{
border-color: #15d748;
border-style: solid;
border-width:2px;
border-radius: 4px
}
.relate_on_hold{
border-color: #f6af45;
border-style: solid;
border-width:2px;
border-radius: 4px
}
.relate_dropped{
border-color: #5a5855;
border-style: solid;
border-width:2px;
border-radius: 4px
}

.subCheckIn{
display:block;
top: -20px;
left: 5px;
opacity: 0.5;
position: relative;
padding: 0 2px;
width: 16px;
height: 18px;
background: no-repeat url(/img/ico/ico_eye.png) 50% top;
}

`);
    // 检测 indexedDB 兼容性，因为只有新版本浏览器支持
    let indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
    // 初始化 indexedDB
    const dbName = 'Bangumi_Subject_Info';
    const tableName = 'info';
    const indexName = 'id';
    if (indexedDB) {
        let request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = evt => {
            let db = evt.target.result;
            let objectStore = db.createObjectStore(tableName, {keyPath: indexName});
        }
        request.onsuccess = evt => {
            removeCache();
        }
    }
    // 用来记录已经被使用的缓存列表
    let cacheLists = [];
    // 获取本地缓存
    function getCache(itemId, callback) {
        let request = indexedDB.open(dbName, 1);
        request.onsuccess = evt => {
            let db = evt.target.result;
            let transaction = db.transaction([tableName], 'readonly');
            let objectStore = transaction.objectStore(tableName);
            let reqInfo = objectStore.get(itemId);
            reqInfo.onsuccess = evt => {
                let result = evt.target.result;
                if(!!result) {
                    cacheLists.push(itemId);
                    callback(true, result.value.content);
                } else {
                    callback(false);
                }
            }
            reqInfo.onerror = evt => {
                callback(false);
            }
        };
    }
    // 记录到本地缓存
    function setCache(itemId, data) {
        let request = indexedDB.open(dbName, 1);
        request.onsuccess = evt => {
            let db = evt.target.result;
            let transaction = db.transaction([tableName], 'readwrite');
            let objectStore = transaction.objectStore(tableName);
            let cache = {
                content: data,
                created: new Date()
            };
            let reqInfo = objectStore.put({id: itemId, value: cache})
            reqInfo.onerror = evt => {
                // //console.log('Error', evt.target.error.name);
            }
            reqInfo.onsuccess = evt => {}
        };
    }
    // 清除和更新缓存
    function removeCache() {
        let request = indexedDB.open(dbName, 1);
        request.onsuccess = evt => {
            let db = evt.target.result;
            let transaction = db.transaction([tableName], 'readwrite'),
                store = transaction.objectStore(tableName),
                twoWeek = 1209600000;
            store.openCursor().onsuccess = evt => {
                let cursor = evt.target.result;
                if (cursor) {
                    if (cacheLists.indexOf(cursor.value.name) !== -1) {
                        cursor.value.created = new Date();
                        cursor.update(cursor.value);
                    } else {
                        let now = new Date(),
                            last = cursor.value.created;
                        if (now - last > twoWeek) {
                            cursor.delete();
                        }
                    }
                    cursor.continue();
                }
            }
        };
    }

    let collectStatus,securitycode,privacy,update=0,count=0,count1=0,flag = 0;
    let itemsList1 = document.querySelectorAll('#columnSubjectHomeB  ul.browserCoverMedium li');
    let itemsList2 = document.querySelectorAll('#columnSubjectHomeB  ul.coversSmall li');
    let itemsList3 = document.querySelectorAll('#columnSubjectHomeB  ul.browserCoverSmall li');
    let itemsList = [];
    for(let i=0;i<itemsList1.length;i++) itemsList.push(itemsList1[i]);
    for(let i=0;i<itemsList2.length;i++) itemsList.push(itemsList2[i]);

    if(localStorage.getItem('bangumi_subject_collectStatus'))
        collectStatus = JSON.parse(localStorage.getItem('bangumi_subject_collectStatus'));
    else collectStatus = {};

    let badgeUserPanel=document.querySelectorAll('#badgeUserPanel a');
    badgeUserPanel.forEach( (elem, index) => {
        if(elem.href.match(/logout/)) securitycode = elem.href.split('/logout/')[1].toString();
    });

    //更新缓存数据
    const updateBtn = createElement('a','chiiBtn','javascript:;','更新');
    updateBtn.addEventListener('click', updateInfo);
    if(itemsList3.length) document.querySelectorAll('#columnSubjectHomeB .subject_section .clearit')[1].append(updateBtn);
    else document.querySelectorAll('#columnSubjectHomeB .subject_section .clearit')[0].append(updateBtn);

    getInfo(update);
    function updateInfo(){
        count=0;
        update=1;
        getInfo(update);
    }

    let privatebox = document.createElement('a'); privatebox.textContent = '私密';
    let checkbox = document.createElement('input'); checkbox.type = 'checkbox';
    privatebox.appendChild(checkbox);
    if(itemsList3.length) $(privatebox).insertAfter(document.querySelectorAll('#columnSubjectHomeB .subject_section .clearit')[0]);
    checkbox.onclick = function (){
        if (checkbox.checked) privacy = 1;
        else privacy = 0;
    };

    let allCollect = createElement('a','chiiBtn','javascript:;','全部标为已读');
    allCollect.onclick = function (){
        if (!confirm("确定要"+allCollect.textContent+"吗？")) return;
        let i = 0;
        flag = (flag==1)?0:1;
        allCollect.textContent =(flag==1)? '全部取消已读':'全部标为已读';
        let getitemsList3= setInterval(function(){
            let elem = itemsList3[i];
            let href = elem.querySelector('a.avatar').href;
            let ID = href.split('/subject/')[1];
            let avatarNeue = elem.querySelector('span.avatarNeue');
            if(flag){
                collectStatus[ID] = 'collect';
                avatarNeue.classList.add('relate_collect');
                $.post('/subject/' + ID + '/interest/update?gh=' + securitycode, { status: 'collect',privacy:privacy});
            }
            else{
                delete collectStatus[ID];
                avatarNeue.classList.remove('relate_collect');
                $.post('/subject/' + ID + '/remove?gh=' + securitycode);
            }
            i++;
            localStorage.setItem('bangumi_subject_collectStatus',JSON.stringify(collectStatus));
            if(i >= itemsList3.length){
                clearInterval(getitemsList3);
            }
        },300);
    };
    if(itemsList3.length)
        $(allCollect).insertAfter(document.querySelectorAll('#columnSubjectHomeB .subject_section .clearit')[0]);

    function createElement(type,className,href,textContent){
        let Element = document.createElement(type);
        Element.className = className;
        Element.href = href;
        Element.textContent = textContent;
        return Element;
    }

    function showCheckIn(elem,ID){
        let checkIn = createElement('a','subCheckIn','javascript:;');
        let flag = 0;
        let avatarNeue = elem.querySelector('span.avatarNeue');
        checkIn.addEventListener('click', function(){
            flag = (flag==1)?0:1;
            if(flag){
                checkIn.style.backgroundPosition= "bottom left";
                collectStatus[ID] = 'collect';
                avatarNeue.classList.add('relate_collect');
                $.post('/subject/' + ID + '/interest/update?gh=' + securitycode, { status: 'collect',privacy:privacy});
            }
            else{
                checkIn.style.backgroundPosition= "top left";
                delete collectStatus[ID];
                avatarNeue.classList.remove('relate_collect');
                $.post('/subject/' + ID + '/remove?gh=' + securitycode);
            }
            localStorage.setItem('bangumi_subject_collectStatus',JSON.stringify(collectStatus));
        });
        elem.querySelector('a.avatar').append(checkIn);
    }

    function getInfo(update){
        if(itemsList.length){
            let fetchList = [],fetchList1 = [];
            itemsList.forEach( (elem, index) => {
                elem.style.height="150px";
                let href = elem.querySelector('a.avatar').href;
                let href1 = href.replace(/subject/,"update");
                let ID = href.split('/subject/')[1];
                getCache(ID, function(success, result) {
                    if (success && !update) {
                        displayRank(result.rank,elem);
                    }
                    else{
                        fetchList.push(elem);
                    }
                });
                if(collectStatus[ID]!='collect')
                    showCheckIn(elem,ID);
                if(collectStatus[ID] && !update)
                    displayCollect(collectStatus[ID],elem);
                else fetchList1.push(elem);
            });
            let i=0,j=0;
            let getitemsList= setInterval(function(){
                let elem = fetchList[i];
                if(!elem) console.log(i);
                else{
                    let href = elem.querySelector('a.avatar').href;
                    showRank(href,elem);
                    i++;
                    //console.log(i);
                }
                if(count >= itemsList.length){
                    clearInterval(getitemsList);
                }
            },500);
            let getitemsList1= setInterval(function(){
                let elem = fetchList1[j];
                if(!elem) console.log(j);
                else{
                    let href = elem.querySelector('a.avatar').href;
                    let href1 = href.replace(/subject/,"update");
                    showCollect(href1,elem);
                    j++;
                    //console.log(j);
                }
                if(count1 >= itemsList.length){
                    clearInterval(getitemsList1);
                }
            },500);
        }
        if(itemsList3.length){
            itemsList3.forEach( (elem, index) => {
                let href = elem.querySelector('a').href;
                let ID = href.split('/subject/')[1];
                if(collectStatus[ID])
                    displayCollect(collectStatus[ID],elem);
                else if(collectStatus[ID]!='collect')
                    showCheckIn(elem,ID);
            });
        }

        let thisItem = window.location.href.replace(/subject/,"update");
        fetch(thisItem,{credentials: "include"})
            .then(data => {
            return new Promise(function (resovle, reject) {
                let targetStr = data.text();
                resovle(targetStr);
            });
        })
            .then(targetStr => {
            let Match = targetStr.match(/"GenInterestBox\('(\S+?)'\)" checked="checked"/);
            let interest = Match ? Match[1] : null;
            let ID = thisItem.split('/update/')[1];
            if(interest) collectStatus[ID] = interest;
            else if(collectStatus[ID]) delete collectStatus[ID];
            localStorage.setItem('bangumi_subject_collectStatus',JSON.stringify(collectStatus));
        });
    }

    function showCollect(href,elem){
        fetch(href,{credentials: "include"})
            .then(data => {
            return new Promise(function (resovle, reject) {
                let targetStr = data.text();
                resovle(targetStr);
            });
        })
            .then(targetStr => {
            let Match = targetStr.match(/"GenInterestBox\('(\S+?)'\)" checked="checked"/);
            let interest = Match ? Match[1] : null;
            let ID = href.split('/update/')[1];
            if(Match){
                collectStatus[ID] = 'collect';
                localStorage.setItem('bangumi_subject_collectStatus',JSON.stringify(collectStatus));
            }
            if(!update) displayCollect(interest,elem);
        });
    }

    function displayCollect(interest,elem){
        let avatarNeue = elem.querySelector('span.avatarNeue');
        if(interest=='wish')          avatarNeue.classList.add('relate_wish');
        else if(interest=='collect')  avatarNeue.classList.add('relate_collect');
        else if(interest=='do')       avatarNeue.classList.add('relate_do');
        else if(interest=='on_hold')  avatarNeue.classList.add('relate_on_hold');
        else if(interest=='dropped')  avatarNeue.classList.add('relate_dropped');
        count1++;
    }

    function showRank(href,elem){
        let xhr = new XMLHttpRequest();
        xhr.open( "GET", href );
        xhr.withCredentials = true;
        xhr.responseType = "document";
        xhr.send();
        xhr.onload = function(){
            let d = xhr.responseXML;
            let nameinfo = d.querySelector('#infobox li');
            let name_cn = nameinfo.innerText.match(/中文名: (\.*)/)?nameinfo.innerText.match(/中文名: (\.*)/)[1]:null;
            //获取排名
            let ranksp = d.querySelector('#panelInterestWrapper .global_score small.alarm');
            let rank = ranksp ? ranksp.innerText.match(/\d+/)[0]:null;
            //获取站内评分和评分人数
            let score = d.querySelector('#panelInterestWrapper .global_score span.number').innerText;
            let votes = d.querySelector('#ChartWarpper small.grey span').innerText;
            //获取好友评分和评分人数
            let frdScore = d.querySelector('#panelInterestWrapper .frdScore');
            let score_f = frdScore ? frdScore.querySelector('span.num').innerText:null;
            let votes_f = frdScore ? frdScore.querySelector('a.l').innerText.match(/\d+/)[0]:null;
            let score_u=0;
            let info = {"name_cn":name_cn,"rank":rank,"score":score,"votes":votes,"score_f":score_f,"votes_f":votes_f,"score_u":score_u};
            let ID = href.split('/subject/')[1];
            setCache(ID,info);
            if(!update) displayRank(rank,elem);
            else{
                count+=1;
                updateBtn.textContent='更新中... (' + count + '/' + itemsList.length +')';
                if(count==itemsList.length){ updateBtn.textContent='更新完毕！';}
            }
        };
    }

    function displayRank(rank,elem){
        let rankSp = createElement('span','rank');
        if (rank) {
            if(rank<=1500) rankSp.classList.add('relate_rank_1');
            else rankSp.classList.add('relate_rank');
            rankSp.innerHTML = `<small>Rank </small>${rank}`;
            elem.append(rankSp);
        }
        count++;
    }

})();

