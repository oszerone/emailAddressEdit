var actionKeys = {
	"BACKSPACE" : 8,
	"ENTER" : 13,
	"LEFT" : 37,
	"UP" : 38,
	"RIGHT" : 39,
	"DOWN" : 40,
	"DELETE" : 46
};
var lastInputValue = "";
var suggestUl, itemList, historyList, hoverSuggestLi;
window.onload = function(){
	init();
	suggestUl = document.getElementById("suggest");
	hoverSuggestLi = suggestUl.childNodes[0];
	itemList = document.getElementById("emailAddr");
	historyList = document.getElementById("history-list");
	initEdit();
	bindEvent();
};
function init(){
	Date.prototype.format = function(){
		return this.getFullYear() + "-" + (this.getMonth() + 1) + "-" + this.getDate()
			+ " " + this.getHours() + ":" + this.getMinutes() + ":" + this.getSeconds();
	}
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
		focusInput();
	}
	suggestUl.onmouseover = function(e){//selection effect
		var src = e.target;
		if(src.tagName.toLowerCase() === "li"){
			hoverSuggest(src);
			log("onmouseover: " + htmlEscape(src.innerHTML));
		}
	};
	suggestUl.onclick = function(e){//selct
		var src = e.target;
		while(src.className !== "suggest-email" && src.tagName.toLowerCase() !== "li"){
			src = src.parentNode;
		}
		if(src.tagName.toLowerCase() === "li"){
			log("onclick selected suggest");
			insertSuggest(src);
		}
	};
	var editInput = document.getElementById("item-edit").childNodes[0];
	editInput.onkeydown = editInput.onkeypress = editInput.onkeyup = function(e){
		changeInputValue(e.target.value);
		checkToDo(e);
	};
}
function checkToDo(e){//需要控制时间，防止按住不放时全部删除，或者按住不放只删除一个的交互缺陷
	if(isActionKey(e.keyCode)){
		//现在如果删除最后一个字母时会删除前一个item
		if(e.type === "keyup"){//keyup和keydown改如何抉择
			log("=========" + e.type + "=======" + e.keyCode);
			if(e.target.value === ""){
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
		}
	}
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
	if(lastInputValue !== value){//此处的控制需要抉择然如控制模块还是功能模块
		var inputItem = document.getElementById("item-edit");
		var editInput = inputItem.childNodes[0], editSpan = inputItem.childNodes[1];
		editInput.value = value;
		editSpan.innerHTML = value + "WW";
		var width = editSpan.offsetWidth < 30 ? 30 : editSpan.offsetWidth;//改为clientWidth，不包括padding
		editInput.style.width = width + "px";
		showSuggest(value);
		lastInputValue = value;
		log("changeInputValue :: value = " + htmlEscape(value) + ", width = " + width);
	}
}
function showSuggest(filter){
	var suggestInnerHTML = "";
	if(filter){
		var emails = getAllSuggestEmail(filter);
		for(var i = 0; i < emails.length; i++){
			suggestInnerHTML += "<li>" + emails[i].replace(new RegExp(filter, "g"), "<strong>" + filter + "</strong>") + "</li>";
		}
		suggestUl.innerHTML = suggestInnerHTML;
	}
	if(filter && suggestInnerHTML){
		var inputItem = document.getElementById("item-edit");
		var editSpanRect = inputItem.childNodes[1].getBoundingClientRect();
		suggestUl.style.left = editSpanRect.left + "px";
		suggestUl.style.top = (editSpanRect.top + editSpanRect.height) + "px";
		hoverSuggest(suggestUl.firstChild);
		suggestUl.style.visibility = "visible";
	}else{
		suggestUl.style.visibility = "hidden";
	}
}
function getAllSuggestEmail(filter){
	log("getAllSuggestEmail :: enter, filter = " + filter);
	var allHistory = historyList.value.replace(/^\s+|\s+$/g, "").split(/\s+|;/);
	var allSuggestEmail = [];
	for(var i = 0; i < allHistory.length; i++){
		if(allHistory[i].indexOf(filter) !== -1){
			allSuggestEmail.push(allHistory[i]);
		}
	}
	log("getAllSuggestEmail :: end, emails = " + allSuggestEmail);
	return allSuggestEmail;
}
function insertSuggest(suggestLi){
	var inputItem = document.getElementById("item-edit");
	var email = suggestLi.innerHTML.replace(/<[\/]?strong>/g,"");
	var newItem = createItem(email);
	itemList.insertBefore(newItem, inputItem);
	newItem.ondblclick = function(e){
		var src = e.target;
		while(src.className !== "email-list-item"){
			src = src.parentNode;
		}
		editItem(src);
	};
	changeInputValue("");
	log("insertSuggest :: email = " + htmlEscape(email));
}
function hoverSuggest(li){
	if(hoverSuggestLi){
		hoverSuggestLi.className = hoverSuggestLi.className.replace(/hover/, "").replace(/^\s+|\s+$/g, "");
	}
	li.className = (hoverSuggestLi.className + " hover").replace(/^\s+|\s+$/g, "");
	hoverSuggestLi = li;
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
	var infoDiv = document.getElementById("info");
	infoDiv.firstChild.innerHTML += "<br />" + now() + " :: " + content;
	infoDiv.scrollTop = infoDiv.scrollHeight - infoDiv.offsetHeight;
}
function htmlEscape(str) {
	if (!str) return str;
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function now(){
	return new Date().format();
}
