// ==UserScript==
// @name         Hauptskript für Kontextmenü
// @namespace    none
// @version      1.0.6
// @description  Erstellt das Kontextmenü basierend auf externer Menüstruktur
// @include      https://nd-jira.unity.media.corp/*
// @grant        GM.xmlHttpRequest
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/main.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/main.js
// ==/UserScript==

(function() {
    'use strict';

    const COMMON_STYLES = {
        backgroundColor: '#fbfbfb',
        border: '1px solid #ddd',
        cursor: 'pointer',
        borderRadius: '8px',
        boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.1)',
        fontFamily: '"Roboto", "LocalRoboto", "Helvetica Neue", "Helvetica", sans-serif'
    };

    class ContextMenu {
        constructor() {
            this.menuData = JSON.parse(localStorage.getItem("menuData") || "[]");
            this.targetElement = null;
            this.menu = this.createMainMenu();
            this.initializeEventListeners();
            localStorage.clear();
        }

        createMainMenu() {
            const menu = this.createElement('div', {
                ...COMMON_STYLES,
                position: 'absolute',
                padding: '5px',
                display: 'none',
                zIndex: '10000',
                width: '200px'
            });

            this.menuData.forEach((category, index) => {
                menu.appendChild(this.createCategoryItem(category, index));
            });

            document.body.appendChild(menu);
            return menu;
        }

        createElement(tag, styles, innerText = '') {
            const element = document.createElement(tag);
            Object.assign(element.style, styles);
            if (innerText) element.innerText = innerText;
            return element;
        }

        createCategoryItem(category, index) {
            const categoryItem = this.createElement('div', {
                padding: '5px',
                cursor: 'pointer',
                position: 'relative',
                borderBottom: index < this.menuData.length - 1 ? '1px solid #ddd' : ''
            }, category.label);

            const subMenu = this.createSubMenu(category.items);
            this.attachCategoryListeners(categoryItem, subMenu);
            categoryItem.appendChild(subMenu);
            return categoryItem;
        }

        createSubMenu(items) {
            const subMenu = this.createElement('div', {
                ...COMMON_STYLES,
                position: 'absolute',
                bottom: '0',
                left: '100%',
                display: 'none',
                width: '350px'
            });

            items.forEach(snippet => {
                subMenu.appendChild(this.createSubMenuItem(snippet));
            });

            return subMenu;
        }

        createSubMenuItem(snippet) {
            const subMenuItem = this.createElement('div', {
                padding: '5px',
                cursor: 'pointer',
                borderBottom: '1px solid #ddd'
            }, snippet.label);

            this.attachSubMenuListeners(subMenuItem, snippet.text);
            return subMenuItem;
        }

        attachCategoryListeners(categoryItem, subMenu) {
            categoryItem.addEventListener('mouseenter', () => {
                categoryItem.style.backgroundColor = '#f0f0f0';
                subMenu.style.display = 'block';
                this.adjustSubMenuPosition(categoryItem, subMenu);
            });

            categoryItem.addEventListener('mouseleave', () => {
                categoryItem.style.backgroundColor = 'transparent';
                subMenu.style.display = 'none';
            });
        }

        attachSubMenuListeners(subMenuItem, snippetText) {
            subMenuItem.addEventListener('mouseenter', () => {
                subMenuItem.style.backgroundColor = '#f0f0f0';
            });

            subMenuItem.addEventListener('mouseleave', () => {
                subMenuItem.style.backgroundColor = 'transparent';
            });

            subMenuItem.addEventListener('click', () => {
                this.handleClick(snippetText);
            });
        }

        adjustSubMenuPosition(categoryItem, subMenu) {
            const categoryItemRect = categoryItem.getBoundingClientRect();
            const subMenuRect = subMenu.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            if (categoryItemRect.bottom + subMenuRect.height > viewportHeight) {
                subMenu.style.bottom = '0';
            }
        }

        async getClipboardText() {
            try {
                const text = await navigator.clipboard.readText();
                return /^[\d\-\/]+$/.test(text) ? text : '00000000';
            } catch (err) {
                console.error('Failed to read clipboard contents: ', err);
                return '00000000';
            }
        }

        async replacePlaceholder(text) {
            if (text.includes("%%t")) {
                const clipboardText = await this.getClipboardText();
                text = text.replace("%%t", clipboardText);
            }

            const csValue = document.getElementById("customfield_10200-val")?.innerText.trim() || '00000000';
            return text.replace("%%CS", csValue);
        }

        insertText(elem, text) {
            if (elem.isContentEditable) {
                document.execCommand("insertText", false, text);
            } else if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
                const startPos = elem.selectionStart;
                elem.value = elem.value.slice(0, startPos) + text + elem.value.slice(elem.selectionEnd);
                elem.selectionStart = elem.selectionEnd = startPos + text.length;

                const startMarkPos = startPos + text.indexOf("NAME");
                if (startMarkPos !== -1) {
                    elem.selectionStart = startMarkPos;
                    elem.selectionEnd = startMarkPos + "NAME".length;
                }
            }
            elem.focus();
        }

        initializeEventListeners() {
            document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
            document.addEventListener('click', this.handleDocumentClick.bind(this));
        }

        handleContextMenu(event) {
            const target = event.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                event.preventDefault();
                this.targetElement = target;
                this.positionMenu(event);
            }
        }

        positionMenu(event) {
            this.menu.style.display = 'block';
            const { clientX, clientY, pageX, pageY } = event;
            const { offsetHeight, offsetWidth } = this.menu;
            const { innerHeight, innerWidth } = window;

            const top = pageY + offsetHeight > innerHeight ?
                innerHeight - offsetHeight - 5 : pageY;
            const left = pageX + offsetWidth > innerWidth ?
                innerWidth - offsetWidth - 5 : pageX;

            this.menu.style.top = `${top}px`;
            this.menu.style.left = `${left}px`;
        }

        handleDocumentClick(event) {
            if (!this.menu.contains(event.target)) {
                this.menu.style.display = 'none';
            }
        }

        async handleClick(snippetText) {
            const textToInsert = await this.replacePlaceholder(snippetText);
            this.insertText(this.targetElement, textToInsert);
            this.menu.style.display = 'none';
        }
    }

    new ContextMenu();
})();
