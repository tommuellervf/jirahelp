// ==UserScript==
// @name         Hauptskript für Kontextmenü Test
// @namespace    none
// @version      1.0.26
// @description  Erstellt das Kontextmenü basierend auf externer Menüstruktur
// @include      *
// @grant        GM.xmlHttpRequest
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/test.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/test.js
// @noframes
// ==/UserScript==
(function() {
    'use strict';

    const processedFrames = new WeakSet();

    function addTinyMCEHandler() {
        const iframes = document.querySelectorAll('iframe.tox-edit-area__iframe');
        iframes.forEach(iframe => {
            if (!processedFrames.has(iframe) && iframe.contentDocument) {
                const addListeners = () => {
                    iframe.contentDocument.addEventListener('contextmenu', function(event) {
                        event.preventDefault();
                        const editor = tinymce.get(iframe.id.replace('_ifr', ''));
                        if (editor && editor.initialized) {
                            editor.focus();
                            contextMenuInstance.menu.style.left = `${event.clientX}px`;
                            contextMenuInstance.menu.style.top = `${event.clientY}px`;
                            contextMenuInstance.menu.style.position = 'fixed';
                            setTimeout(() => {
                                contextMenuInstance.targetElement = editor;
                                contextMenuInstance.isTinyMCE = true;
                                contextMenuInstance.positionMenu(event, true);
                            }, 170);
                        }
                    });

                    iframe.contentDocument.addEventListener('click', function() {
                        contextMenuInstance.menu.style.transform = 'scale(0.9)';
                        contextMenuInstance.menu.style.opacity = '0';
                        setTimeout(() => {
                            contextMenuInstance.menu.style.display = 'none';
                        }, 200);
                    });
                };

                if (iframe.contentDocument.readyState === 'complete') {
                    addListeners();
                } else {
                    iframe.contentDocument.addEventListener('load', addListeners);
                }

                processedFrames.add(iframe);
            }
        });
    }

    const COMMON_STYLES = {
        backgroundColor: '#ffffff',
        border: '1px solid rgba(80, 80, 80, 0.2)',
        cursor: 'pointer',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        fontFamily: '"-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Fira Sans", "Droid Sans", "Helvetica Neue", "sans-serif"',
    };

    class ContextMenu {
        constructor() {
            this.menuData = this.loadMenuData();
            this.targetElement = null;
            this.isTinyMCE = false;
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
            const element = document.createElement(tag);
            Object.assign(element.style, styles);
            if (innerText) element.innerText = innerText;
            return element;
        }

        createMainMenu() {
            const menu = this.createElement('div', {
                ...COMMON_STYLES,
                position: 'absolute',
                padding: '2px',
                display: 'none',
                zIndex: '10000',
                width: '200px'
            });

            if (Array.isArray(this.menuData)) {
                this.menuData.forEach((category, index) => {
                    menu.appendChild(this.createCategoryItem(category, index));
                });
            }

            document.body.appendChild(menu);
            return menu;
        }

        createCategoryItem(category, index) {
            const categoryItem = this.createElement('div', {
                padding: '5px',
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
                padding: '2px',
                left: '90%',
                display: 'none',
                width: '350px',
                zIndex: '11000',
            });

            const isMouseOverSubMenu = (event) => {
                const rect = subMenu.getBoundingClientRect();
                return (
                    event.clientX >= rect.left &&
                    event.clientX <= rect.right &&
                    event.clientY >= rect.top &&
                    event.clientY <= rect.bottom
                );
            };

            const isMouseAtTop = (event) => {
                const mouseY = event.clientY;
                const windowHeight = window.innerHeight;
                return mouseY < windowHeight / 2;
            };

            window.addEventListener('mousemove', (event) => {
                if (!isMouseOverSubMenu(event)) {
                    if (isMouseAtTop(event)) {
                        subMenu.style.top = '0';
                        subMenu.style.bottom = '';
                    } else {
                        subMenu.style.top = '';
                        subMenu.style.bottom = '0';
                    }
                }
            });

            items.forEach((snippet, index) => {
                if (snippet && snippet.label) {
                    const isLastItem = index === items.length - 1;
                    subMenu.appendChild(this.createSubMenuItem(snippet, isLastItem));
                }
            });

            return subMenu;
        }

        createSubMenuItem(snippet, isLastItem) {
            const subMenuItem = this.createElement('div', {
                padding: '5px',
                cursor: 'pointer',
                borderBottom: isLastItem ? 'none' : '1px solid #ddd'
            }, snippet.label);

            this.attachSubMenuListeners(subMenuItem, snippet.text);
            return subMenuItem;
        }

        attachCategoryListeners(categoryItem, subMenu) {
            categoryItem.addEventListener('mouseenter', () => {
                categoryItem.style.backgroundColor = '#ECEDF0';
                categoryItem.style.borderRadius = '5px';
                categoryItem.style.transition = 'background-color 0.3s ease, border-radius 0.3s ease';
                subMenu.style.display = 'block';
            });

            categoryItem.addEventListener('mouseleave', () => {
                categoryItem.style.backgroundColor = 'transparent';
                categoryItem.style.borderRadius = '0px';
                subMenu.style.display = 'none';
            });
        }

        attachSubMenuListeners(subMenuItem, snippetText) {
            subMenuItem.addEventListener('mouseenter', () => {
                subMenuItem.style.backgroundColor = '#ECEDF0';
                subMenuItem.style.borderRadius = '5px';
            });

            subMenuItem.addEventListener('mouseleave', () => {
                subMenuItem.style.backgroundColor = 'transparent';
                subMenuItem.style.borderRadius = '0px';
            });

            subMenuItem.addEventListener('click', () => {
                this.handleClick(snippetText);
            });
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
            if (!text) return '';

            if (text.includes("%%t")) {
                const clipboardText = await this.getClipboardText();
                text = text.replace("%%t", clipboardText);
            }

            const csElement = document.getElementById("customfield_10200-val");
            const csValue = csElement?.innerText.trim() || '00000000';
            text = text.replace("%%CS", csValue);

            if (text.includes("%%ASSIGNEE")) {
                const assigneeElement = document.querySelector('#assignee-val > span.user-hover-replaced[rel]');
                const userId = assigneeElement?.getAttribute('rel') || 'NAME';
                text = text.replace("%%ASSIGNEE", `[~${userId}]`);
            }

            return text;
        }

        async insertText(elem, text) {
            if (!elem || !text) return;

            if (this.isTinyMCE) {
                elem.insertContent(text);
                this.isTinyMCE = false;
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
                this.isTinyMCE = false;
                this.positionMenu(event, true);

                this.menu.style.visibility = 'visible';
                this.menu.style.display = 'block';
                this.menu.style.opacity = '1';
                this.menu.style.transform = 'scale(1)';
            }
        }

        positionMenu(event) {
            this.menu.style.display = 'block';
            this.menu.style.opacity = '0';
            this.menu.style.transform = 'scale(0.9)';
            this.menu.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
            this.menu.style.position = 'fixed';

            let clickX = event.clientX;
            let clickY = event.clientY;

            if (event.target.ownerDocument !== document) {
                const iframe = event.target.ownerDocument.defaultView.frameElement;
                const iframeRect = iframe.getBoundingClientRect();
                clickX = event.clientX + iframeRect.left;
                clickY = event.clientY + iframeRect.top;
            }

            const { offsetHeight, offsetWidth } = this.menu;
            const { innerHeight, innerWidth } = window;

            const top = (clickY + offsetHeight > innerHeight) ? innerHeight - offsetHeight - 5 : clickY;
            const left = (clickX + offsetWidth > innerWidth) ? innerWidth - offsetWidth - 5 : clickX;

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
            let textToInsert = await this.replacePlaceholder(snippetText);

            if (this.isTinyMCE) {
                textToInsert = this.formatText(textToInsert);
                this.targetElement.insertContent(textToInsert);

                setTimeout(() => {
                    const body = this.targetElement.getBody();
                    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);

                    let node;
                    while (node = walker.nextNode()) {
                        const position = node.nodeValue.indexOf('NAME');
                        if (position !== -1) {
                            const range = this.targetElement.dom.createRng();
                            range.setStart(node, position);
                            range.setEnd(node, position + 4);
                            this.targetElement.selection.setRng(range);
                            break;
                        }
                    }
                }, 100);

                this.isTinyMCE = false;
            } else {
                this.insertText(this.targetElement, textToInsert);
            }

            this.menu.style.display = 'none';
        }

        formatText(text) {
            return text
                .replace(/\*([\s\S]*?)\*/g, '<b>$1</b>')
                .replace(/{color:(.*?)}/g, '<span style="color:$1;">')
                .replace(/{color}/g, '</span>')
                .replace(/\n/g, '<br>')
                .replace(/\[~(.*?)\]/g, (match, userId) => `<a class="user-hover" rel="${userId}" id="user_${userId}" href="/secure/ViewProfile.jspa?name=${userId}" data-username="${userId}">@${userId}</a>`);
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addTinyMCEHandler);
    } else {
        addTinyMCEHandler();
    }

    setInterval(addTinyMCEHandler, 500);

})();
