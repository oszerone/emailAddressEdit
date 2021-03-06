var actionKeys = {
	"BACKSPACE" : 8,
	"ENTER" : 13,
	"LEFT" : 37,
	"UP" : 38,
	"RIGHT" : 39,
	"DOWN" : 40,
	"DELETE" : 46,
	"SEMICOLON" : 186
};
//xxxTime用于控制操作频率，减少cpu负荷
var debug = true, lastLogTime = 0, logBuffer = "";
var lastInputValue = "", lastActionTime = 0, historyList = [];
var suggestUl, itemList, hoverSuggestLi;
window.onload = function(){
	init();
	suggestUl = document.getElementById("suggest");
	itemList = document.getElementById("emailAddr");
	initEdit();
	bindEvent();
};
function init(){
	Date.prototype.format = function(){
		return this.getFullYear() + "-" + (this.getMonth() + 1) + "-" + this.getDate()
			+ " " + this.getHours() + ":" + this.getMinutes() + ":" + this.getSeconds();
	}
	String.prototype.trim = String.prototype.trim || function(){
		return this.replace(/^\s+|\s+$/g, "");
	}
	setHistoryList();
}
function setHistoryList(){
	historyDom = document.getElementById("history-list");
	historyList = historyDom.value.replace(/^\s+|\s+$/g, "").split(/\s+|;/);
	historyList.push("");//保持最后有"; "分割符号
	historyDom.value = historyList.join("; ").replace(/(; )+/g, "; ");
	log("setHistoryList :: history = " + historyList);
}
function initEdit(){
	itemList.innerHTML = '<div id="item-edit" class="email-list-item-edit">'
							+ '<input id="edit" type="text" class="email-edit-input" />'
							+ '<span>WW</span>'
						+ '</div>';
	return itemList.firstChild;
}
function bindEvent(){
	itemList.onclick = itemList.ondblclick = function(e){
		e = e || event;
		if(e.type === "dblclick"){
			var src = e.target || e.srcElement;
			while(src.className !== "email-list-item" && src.className !== "email-list"){
				src = src.parentNode;
			}
			if(src.className === "email-list-item"){
				editItem(src);
			}
		}
		focusInput();
	};
	suggestUl.onmouseover = function(e){//selection effect
		e = e || event;
		var src = e.target || e.srcElement;
		if(src.tagName.toLowerCase() === "li"){
			hoverSuggest(src);
			log("onmouseover: " + htmlEscape(src.innerHTML));
		}
	};
	suggestUl.onclick = function(e){//selct
		e = e || event;
		var src = e.target || e.srcElement;
		while(src.className !== "suggest-email" && src.tagName.toLowerCase() !== "li"){
			src = src.parentNode;
		}
		if(src.tagName.toLowerCase() === "li"){
			log("onclick selected suggest");
			insertSuggest(src);
			focusInput();
		}
	};
	var editInput = document.getElementById("item-edit").childNodes[0];
	editInput.onkeydown = editInput.onkeypress = editInput.onkeyup = function(e){
		e = e || event;
		changeInputValue();
		checkToDo(e);
	};
}
function checkToDo(e){//函数名称不太好
	var now = new Date().getTime();
	var src = e.tartet || e.srcElement;
	log("checkToDo :: enter, lastActionTime = " + lastActionTime + ", type = " + e.type);
	//现在如果删除最后一个字母时会删除前一个item
	if(e.type === "keydown" && (now - lastActionTime) > 50){//这个响应时间需要调查
		if(isActionKey(e.keyCode)){
			log("checkToDo :: type = " + e.type + ", keyCode = " + e.keyCode);
			if(src.value === ""){
				if(e.keyCode === actionKeys.BACKSPACE){
					deletePrevItem();
				}else if(e.keyCode === actionKeys.LEFT){
					moveInputItemToLeft();
				}else if(e.keyCode === actionKeys.RIGHT){
					moveInputItemToRight();
				}else if(e.keyCode === actionKeys.DELETE){
					deleteNextItem();
				}
			}else{
				if(e.keyCode === actionKeys.ENTER){
					if(hoverSuggestLi) insertSuggest(hoverSuggestLi);
				}else if(e.keyCode === actionKeys.UP){
					upHoverSuggest();
				}else if(e.keyCode === actionKeys.DOWN){
					downHoverSuggest();
				}
			}
			lastActionTime = now;
		}
	}else if(e.type === "keyup"){
		if(e.keyCode === actionKeys.SEMICOLON){
			var val = src.value.replace(/;/g, "").trim();
			if(val){
				insertItem(val);
			}
		}
		lastActionTime = 0;
	}
	log("checkToDo :: end, timeInterval = " + (now - lastActionTime));
}
function createItem(email){
	var div = document.createElement("div");
	var name = email.substring(0, email.indexOf("@"));
	div.innerHTML = '<div class="email-list-item">'
						+ '<strong>' + name + '</strong>'
						+ '<em>&lt;' + email + '&gt;</em>'
					+ '</div>';
	var item = div.firstChild;
	div.removeChild(item);
	return item;
}
function insertItem(email, name){
	var item = createItem(email);
	var inputItem = document.getElementById("item-edit");
	itemList.insertBefore(item, inputItem);
	changeInputValue("");
}
function deletePrevItem(){
	var inputItem = document.getElementById("item-edit");
	var prevItem = inputItem.previousSibling;
	if(prevItem){
		itemList.removeChild(prevItem);
	}
}
function deleteNextItem(){
	var inputItem = document.getElementById("item-edit");
	var nextItem = inputItem.nextSibling;
	if(nextItem){
		itemList.removeChild(nextItem);
	}
}
function editItem(item){
	var email = item.childNodes[1].innerHTML.replace(/(&lt;)|(&gt;)/g, "");
	log("editItem :: email = " + htmlEscape(email));
	var inputItem = document.getElementById("item-edit");
	itemList.replaceChild(inputItem, item);
	changeInputValue(email);
	showSuggest("");//双击编辑后先不显示suggest，待修改后再显示
}
function moveInputItemToLeft(){
	var inputItem = document.getElementById("item-edit");
	var prevItem = inputItem.previousSibling;
	var nextItem = inputItem.nextSibling;
	if(prevItem){
		itemList.insertBefore(prevItem, nextItem);
	}
}
function moveInputItemToRight(){
	var inputItem = document.getElementById("item-edit");
	var nextItem = inputItem.nextSibling;
	if(nextItem){
		itemList.insertBefore(nextItem, inputItem);
	}
}
function changeInputValue(value){
	var val = value;
	var inputItem = document.getElementById("item-edit");
	var editInput = inputItem.childNodes[0], editSpan = inputItem.childNodes[1];
	if(val === undefined){
		val = editInput.value;
	}
	log("changeInputValue :: enter, value = " + value + ", val = " + val);
	if(lastInputValue != val){//此处的控制需要抉择然如控制模块还是功能模块
		if(value === val){//只有强制更改时才更改（浏览器会有默认action），防止BACKSPACE键导致光标永远在最后
			editInput.value = val;
		}
		editSpan.innerHTML = val + "WW";
		var width = editSpan.offsetWidth < 30 ? 30 : editSpan.offsetWidth;//改为clientWidth，不包括padding
		editInput.style.width = width + "px";
		showSuggest(val);
		lastInputValue = val;
	}
	log("changeInputValue :: end, lastInputValue = " + lastInputValue);
}
function showSuggest(filter){
	var suggestInnerHTML = "";
	if(filter){
		var emails = getAllSuggestEmail(filter);
		for(var i = 0; i < emails.length; i++){
			suggestInnerHTML += "<li>" + emails[i].replace(new RegExp(filter, "g"), "<strong>" + filter + "</strong>") + "</li>";
		}
	}
	suggestUl.innerHTML = suggestInnerHTML;
	if(filter && suggestInnerHTML){
		var inputItem = document.getElementById("item-edit");
		var editSpanRect = inputItem.childNodes[1].getBoundingClientRect();
		hoverSuggest(suggestUl.firstChild);
		suggestUl.style.visibility = "visible";
		//要么增加滚动条（上下箭头hover时需要滚动滚动条让hoverLi在显示区），要么只显示前10项
		//var height6 = 4 + 26 * 6;
		//suggestUl.style.height = suggestUl.scrollHeight > height6 ? height6 + "px" : "";
		var left = editSpanRect.left + suggestUl.offsetWidth > document.body.offsetWidth
			? document.body.offsetWidth - suggestUl.offsetWidth : editSpanRect.left;
		suggestUl.style.left = left + "px";
		suggestUl.style.top = (editSpanRect.top + editSpanRect.height + 5) + "px";
	}else{
		hoverSuggestLi = null;
		suggestUl.style.visibility = "hidden";
	}
}
function getAllSuggestEmail(filter){
	log("getAllSuggestEmail :: enter, filter = " + filter);
	var allSuggestEmail = [];
	for(var i = 0; i < historyList.length; i++){
		if(historyList[i].indexOf(filter) !== -1){
			allSuggestEmail.push(historyList[i]);
		}
	}
	log("getAllSuggestEmail :: end, emails = " + allSuggestEmail);
	return allSuggestEmail;
}
function insertSuggest(suggestLi){
	log("insertSuggest :: enter, suggestLi = " + htmlEscape(suggestLi.innerHTML));
	var inputItem = document.getElementById("item-edit");
	var email = suggestLi.innerHTML.replace(/<[\/]?strong>/g,"");
	var item = createItem(email);
	itemList.insertBefore(item, inputItem);
	changeInputValue("");
	log("insertSuggest :: end, email = " + htmlEscape(email));
}
function hoverSuggest(li){
	log("hoverSuggest :: enter, hoverSuggestLi = " + hoverSuggestLi);
	if(hoverSuggestLi){
		hoverSuggestLi.className = hoverSuggestLi.className.replace(/hover/, "").trim();
	}
	li.className = (li.className + " hover").trim();
	hoverSuggestLi = li;
	log("hoverSuggest :: end, li = " + htmlEscape(li.innerHTML));
}
function upHoverSuggest(){
	if(hoverSuggestLi && suggestUl.childNodes.length > 0){
		var li = hoverSuggestLi.previousSibling ? hoverSuggestLi.previousSibling : suggestUl.lastChild;
		hoverSuggest(li);
	}
}
function downHoverSuggest(){
	if(hoverSuggestLi && suggestUl.childNodes.length > 0){
		var li = hoverSuggestLi.nextSibling ? hoverSuggestLi.nextSibling : suggestUl.firstChild;
		hoverSuggest(li);
	}
}
function focusInput(){
	document.getElementById("edit").focus();
}
function isActionKey(keyCode){
	log("isActionKey :: enter, keyCode = " + keyCode);
	var result = false;
	for(var key in actionKeys){
		if(keyCode === actionKeys[key]){
			result = true;
			break;
		}
	}
	log("isActionKey :: enter, result = " + result);
	return result;
}
function log(content){
	var now = new Date().getTime();
	logBuffer += "<br />" + new Date().format() + " :: " + content;
	if(debug && (now - lastLogTime) > 500){
		var infoDiv = document.getElementById("info");
		if(infoDiv.scrollHeight > 5000){
			infoDiv.firstChild.innerHTML = "";
		}
		infoDiv.firstChild.innerHTML += logBuffer;
		infoDiv.scrollTop = infoDiv.scrollHeight - infoDiv.offsetHeight + 50;
		lastLogTime = now;
		logBuffer = "";
	}
}
function clearlog(){
	var infoDiv = document.getElementById("info");
	infoDiv.firstChild.innerHTML + "";
}
function htmlEscape(str) {
	if (!str) return str;
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
