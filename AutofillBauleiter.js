// ==UserScript==
// @name         Autofill Bauleiter
// @namespace    none
// @version      1.0.5
// @description  Autofill Bauleiter
// @include      https://nd-jira.unity.media.corp/*
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillBauleiter.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillBauleiter.js
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(function() {
    'use strict';

    function getBearbeiterName() {
        const parentElement = document.getElementById('assignee-val');
        if (parentElement) {
            const spanElement = parentElement.querySelector('span.user-hover.user-hover-replaced');
            if (spanElement) {
                const nameTextNode = Array.from(spanElement.childNodes)
                .find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
                return nameTextNode ? nameTextNode.textContent.trim() : null;
            }
        }
        return null;
    }

    function fillFields() {
        const inputField1 = document.querySelector('#customfield_12302-field');
        const inputField2 = document.querySelector('#customfield_12303-field');
        const bearbeiterName = getBearbeiterName();

        if (inputField1 && inputField2 && bearbeiterName) {
            inputField1.value = bearbeiterName;
            inputField1.dispatchEvent(new Event('input'));

            setTimeout(() => {
                inputField1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true, cancelable: true }));
            }, 500);

            setTimeout(() => {
                inputField2.value = bearbeiterName;
                inputField2.dispatchEvent(new Event('input'));

                setTimeout(() => {
                    inputField2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true, cancelable: true }));
                }, 500);
            }, 1000);
        } else {
            console.error('Input fields or Bearbeiter name not found');
        }
    }

    function initializeObserver() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };

        const callback = function(mutationsList, observer) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const dialogElement = document.getElementById('workflow-transition-231-dialog');
                    if (dialogElement) {
                        observer.disconnect();
                        setTimeout(fillFields, 1000);
                        break;
                    }
                }
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    initializeObserver();

    document.addEventListener('click', function(event) {
        if (event.target.id === 'issue-workflow-transition-cancel') {
            initializeObserver();
        }
    });
})();
