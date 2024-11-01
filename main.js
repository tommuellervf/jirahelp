// ==UserScript==
// @name         Hauptskript für Kontextmenü
// @namespace    none
// @version      1.0.8
// @description  Erstellt das Kontextmenü basierend auf externer Menüstruktur
// @include      https://nd-jira.unity.media.corp/*
// @grant        GM.xmlHttpRequest
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/main.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/main.js
// ==/UserScript==

(function() {
    'use strict';

    const COMMON_STYLES = {
        backgroundColor: '#ffffff',
        border: '1px solid #ccc',
        cursor: 'pointer',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        fontFamily: '"Roboto", "LocalRoboto", "Helvetica Neue", "Helvetica", "sans-serif"',
        transition: 'all 0.2s ease'
    };

    class ContextMenu {
        constructor() {
            this.menuData = this.loadMenuData();
            this.targetElement = null;
            this.menu = this.createMainMenu();
            this.boundHandleContextMenu = this.handleContextMenu.bind(this);
            this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
            this.initializeEventListeners();
        }

        loadMenuData() {
            try {
                const data = localStorage.getItem("menuData");
                return data ? JSON.parse(data) : [];
            } catch (error) {
                console.error('Failed to load menu data:', error);
                return [];
            }
        }

        createElement(tag, styles, innerText = '') {
            if (!tag || typeof tag !== 'string') {
                throw new Error('Invalid tag parameter');
            }
            if (!styles || typeof styles !== 'object') {
                throw new Error('Invalid styles parameter');
            }

            const element = document.createElement(tag);
            Object.assign(element.style, styles);
            if (innerText) element.innerText = innerText;
            return element;
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

            if (this.menuData && Array.isArray(this.menuData)) {
                this.menuData.forEach((category, index) => {
                    menu.appendChild(this.createCategoryItem(category, index));
                });
            }

            document.body.appendChild(menu);
            return menu;
        }

        createCategoryItem(category, index) {
            if (!category || !category.label) {
                console.error('Invalid category data:', category);
                return document.createElement('div');
            }

            const categoryItem = this.createElement('div', {
                padding: '5px',
                cursor: 'pointer',
                position: 'relative',
                borderBottom: index < this.menuData.length - 1 ? '1px solid #ddd' : ''
            }, category.label);

            const subMenu = this.createSubMenu(category.items || []);
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
                width: '350px',
                minHeight: '12px'
            });

            items.forEach(snippet => {
                if (snippet && snippet.label) {
                    subMenu.appendChild(this.createSubMenuItem(snippet));
                }
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
                categoryItem.style.transition = 'background-color 0.3s ease';
                categoryItem.style.backgroundColor = '#f0f0f0';
                this.adjustSubMenuPosition(categoryItem, subMenu);
            });

            categoryItem.addEventListener('mouseleave', () => {
                categoryItem.style.backgroundColor = 'transparent';
                subMenu.style.display = 'none';
            });
        }

        attachSubMenuListeners(subMenuItem, snippetText) {
            if (!subMenuItem || !snippetText) return;

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
            const categoryRect = categoryItem.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let leftPosition = categoryRect.width; 
            let topPosition = -(subMenu.offsetHeight - categoryRect.height);

            if (categoryRect.right + subMenu.offsetWidth > viewportWidth) {
                leftPosition = -subMenu.offsetWidth;
            }

            if (categoryRect.top + topPosition < 0) {
                topPosition = 0;
            }

            subMenu.style.position = 'absolute';
            subMenu.style.left = `${leftPosition}px`;
            subMenu.style.top = `${topPosition}px`;
        }

        async getClipboardText() {
            if (!navigator.clipboard || !navigator.clipboard.readText) {
                console.warn('Clipboard API not available');
                return '00000000';
            }

            try {
                const text = await navigator.clipboard.readText();
                return /^[\d\-\/]+$/.test(text) ? text : '00000000';
            } catch (err) {
                console.error('Failed to read clipboard contents: ', err);
                return '00000000';
            }
        }

        async replacePlaceholder(text) {
            if (!text) return '';

            if (text.includes("%%t")) {
                const clipboardText = await this.getClipboardText();
                text = text.replace("%%t", clipboardText);
            }

            const csElement = document.getElementById("customfield_10200-val");
            const csValue = csElement?.innerText.trim() || '00000000';
            return text.replace("%%CS", csValue);
        }

        insertText(elem, text) {
            if (!elem || !text) return;

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
            document.addEventListener('contextmenu', this.boundHandleContextMenu);
            document.addEventListener('click', this.boundHandleDocumentClick);
        }

        handleContextMenu(event) {
            const target = event.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                event.preventDefault();
                this.targetElement = target;

                this.positionMenu(event);

                this.menu.style.visibility = 'visible';
                this.menu.style.display = 'block';
                this.menu.style.opacity = '1';
                this.menu.style.transform = 'scale(1)';
            }
        }

        positionMenu(event) {
            if (!event) return;

            this.menu.style.display = 'block';
            this.menu.style.opacity = '0';
            this.menu.style.transform = 'scale(0.9)';
            this.menu.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';

            const { pageX, pageY } = event;
            const { offsetHeight, offsetWidth } = this.menu;
            const { innerHeight, innerWidth } = window;

            const top = pageY + offsetHeight > innerHeight ?
                  innerHeight - offsetHeight - 5 : pageY;
            const left = pageX + offsetWidth > innerWidth ?
                  innerWidth - offsetWidth - 5 : pageX;

            this.menu.style.top = `${top}px`;
            this.menu.style.left = `${left}px`;

            setTimeout(() => {
                this.menu.style.opacity = '1';
                this.menu.style.transform = 'scale(1)';
                this.menu.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
            }, 0);
        }

        handleDocumentClick(event) {
            if (!this.menu.contains(event.target)) {
                this.menu.style.transform = 'scale(0.9)';
                this.menu.style.opacity = '0';

                setTimeout(() => {
                    this.menu.style.display = 'none';
                }, 200);
            }
        }

        async handleClick(snippetText) {
            const textToInsert = await this.replacePlaceholder(snippetText);
            this.insertText(this.targetElement, textToInsert);
            this.menu.style.display = 'none';
        }

        destroy() {

            document.removeEventListener('contextmenu', this.boundHandleContextMenu);
            document.removeEventListener('click', this.boundHandleDocumentClick);

            if (this.menu && this.menu.parentNode) {
                this.menu.parentNode.removeChild(this.menu);
            }
        }
    }

    let contextMenuInstance = null;

    window.addEventListener('unload', () => {
        if (contextMenuInstance) {
            contextMenuInstance.destroy();
        }
    });

    contextMenuInstance = new ContextMenu();

})();

