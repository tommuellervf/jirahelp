// ==UserScript==
// @name         Hauptskript für Kontextmenü
// @namespace    none
// @version      1.0.1a
// @description  Erstellt das Kontextmenü basierend auf externer Menüstruktur
// @include      https://nd-jira.unity.media.corp/*
// @grant        GM.xmlHttpRequest
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/main.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/main.js
// ==/UserScript==

(function() {
    'use strict';

    const menuData = JSON.parse(localStorage.getItem("menuData") || "[]");
    localStorage.clear();

     function insertText(elem, text) {
         if (elem.isContentEditable) {
             document.execCommand("insertText", false, text);
         } else if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
             const startPos = elem.selectionStart;
             elem.value = elem.value.slice(0, startPos) + text + elem.value.slice(elem.selectionEnd);
             elem.selectionStart = elem.selectionEnd = startPos + text.length;

             const startMarkPos = startPos + text.indexOf("NAME");
             const endMarkPos = startMarkPos + "NAME".length;

             if (startMarkPos !== -1) {
                 elem.selectionStart = startMarkPos;
                 elem.selectionEnd = endMarkPos;
             }
         }
         elem.focus();
     }

     async function getClipboardText() {
         try {
             const text = await navigator.clipboard.readText();
             if (/^[\d\-\/]+$/.test(text)) {
                 return text;
             } else {
                 return '00000000';
             }
         } catch (err) {
             console.error('Failed to read clipboard contents: ', err);
             return '00000000';
         }
     }

     async function replacePlaceholder(text) {

         if (text.includes("%%t")) {
             const clipboardText = await getClipboardText();
             text = text.replace("%%t", clipboardText);
         }

         const csValue = document.getElementById("customfield_10200-val")?.innerText.trim() || '00000000';
         text = text.replace("%%CS", csValue);

         return text;
     }

     const createElement = (tag, styles, innerText) => {
         const element = document.createElement(tag);
         Object.assign(element.style, styles);
         if (innerText) element.innerText = innerText;
         return element;
     };

     const menu = createElement('div', {
         position: 'absolute',
         backgroundColor: '#fbfbfb',
         border: '1px solid #ddd',
         padding: '5px',
         cursor: 'pointer',
         display: 'none',
         zIndex: '10000',
         width: '200px'
     });

     menuData.forEach(category => {
         const categoryItem = createElement('div', {
             padding: '5px',
             cursor: 'pointer',
             borderBottom: '1px solid #ddd',
             position: 'relative'
         }, category.label);

         const subMenu = createElement('div', {
             position: 'absolute',
             bottom: '0',
             left: '100%',
             backgroundColor: '#fbfbfb',
             border: '1px solid #ddd',
             display: 'none',
             width: '350px'
         });

         category.items.forEach(snippet => {
             const subMenuItem = createElement('div', {
                 padding: '5px',
                 cursor: 'pointer',
                 borderBottom: '1px solid #ddd'
             }, snippet.label);

             subMenuItem.addEventListener('mouseenter', () => { subMenuItem.style.backgroundColor = '#f0f0f0' });
             subMenuItem.addEventListener('mouseleave', () => { subMenuItem.style.backgroundColor = 'transparent' });
             subMenuItem.addEventListener('click', async () => {
                 const textToInsert = await replacePlaceholder(snippet.text);
                 insertText(targetElement, textToInsert);
                 menu.style.display = 'none';
             });

             subMenu.appendChild(subMenuItem);
         });

         categoryItem.appendChild(subMenu);
         menu.appendChild(categoryItem);

         categoryItem.addEventListener('mouseenter', () => {
             subMenu.style.display = 'block';
             const categoryItemRect = categoryItem.getBoundingClientRect();
             const subMenuRect = subMenu.getBoundingClientRect();
             const viewportHeight = window.innerHeight;

             if (categoryItemRect.bottom + subMenuRect.height > viewportHeight) {
                 subMenu.style.bottom = '0';
             }
         });

         categoryItem.addEventListener('mouseleave', () => { subMenu.style.display = 'none' });
     });

     document.body.appendChild(menu);

     let targetElement = null;

     document.addEventListener('contextmenu', function(event) {
         const target = event.target;
         if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
             event.preventDefault();
             targetElement = target;

             menu.style.display = 'block';
             let top = event.pageY, left = event.pageX;

             const menuHeight = menu.offsetHeight, menuWidth = menu.offsetWidth;
             const viewportHeight = window.innerHeight, viewportWidth = window.innerWidth;

             if (event.pageY + menuHeight > viewportHeight) {
                 top = viewportHeight - menuHeight - 5;
             }
             if (event.pageX + menuWidth > viewportWidth) {
                 left = viewportWidth - menuWidth - 5;
             }

             menu.style.top = `${top}px`;
             menu.style.left = `${left}px`;
         }
     });

     document.addEventListener('click', function(event) {
         if (!menu.contains(event.target)) {
             menu.style.display = 'none';
         }
     });
})();
