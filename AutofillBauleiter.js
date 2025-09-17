// ==UserScript==
// @name         Autofill Bauleiter
// @namespace    none
// @version      1.0.10
// @description  Autofill Bauleiter
// @include      https://nd-jira.unity.media.corp/*
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillBauleiter.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillBauleiter.js
// @noframes
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

    async function fillFields() {

        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        const selectors = {
            field1: '#customfield_12302-field',
            field2: '#customfield_12303-field',
            submitButton: '#issue-workflow-transition-submit'
        };

        const field1 = document.querySelector(selectors.field1);
        const field2 = document.querySelector(selectors.field2);
        const submitButton = document.querySelector(selectors.submitButton);
        const bearbeiterName = getBearbeiterName();

        if (!field1 || !field2 || !bearbeiterName) {
            return;
        }

        try {
            field1.value = bearbeiterName;
            field1.dispatchEvent(new Event('input'));
            await delay(500);
            field1.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Tab',
                code: 'Tab',
                keyCode: 9,
                which: 9,
                bubbles: true,
                cancelable: true
            }));
            await delay(500);

            field2.value = bearbeiterName;
            field2.dispatchEvent(new Event('input'));
            await delay(500);
            field2.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Tab',
                code: 'Tab',
                keyCode: 9,
                which: 9,
                bubbles: true,
                cancelable: true
            }));

            if (submitButton) {
                submitButton.focus();
            }
        } catch (error) {
            console.error('Fehler beim Ausfüllen der Felder:', error);
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
                        setTimeout(fillFields, 2000);
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
