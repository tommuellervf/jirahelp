// ==UserScript==
// @name         Hauptskript zum entfernen der Wiki Page Links in Jira
// @namespace    none
// @version      1.0.4
// @description  Entfernt Wiki Page Links in Jira
// @include      https://nd-jira.unity.media.corp/*
// @grant        GM.xmlHttpRequest
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RemoveWikiPage.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RemoveWikiPage.js
// @noframes
// ==/UserScript==

(function() {

    'use strict';

    function removeWikiPageLinks(cell) {
        const childNodes = Array.from(cell.childNodes);
        const nodesToRemove = [];

        for (let i = 0; i < childNodes.length; i++) {
            const node = childNodes[i];

            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A' && node.textContent.trim() === 'Wiki Page') {
                nodesToRemove.push(node);

                const previousSibling = node.previousSibling;
                if (previousSibling && previousSibling.nodeType === Node.TEXT_NODE && previousSibling.textContent.trim() === ',') {
                    nodesToRemove.push(previousSibling);
                }

                const nextSibling = node.nextSibling;
                if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE && nextSibling.textContent.trim() === ',') {
                    const nextNextSibling = nextSibling.nextSibling;
                    if (!nextNextSibling || nextNextSibling.nodeType !== Node.ELEMENT_NODE) {
                        nodesToRemove.push(nextSibling);
                    }
                }
            }
        }

        nodesToRemove.forEach(node => node.remove());
    }

    function observeDOM() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };

        const observer = new MutationObserver((mutationsList, observer) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    const addedNodes = mutation.addedNodes;
                    addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches('td.issuelinks')) {
                                removeWikiPageLinks(node);
                            }

                            const issueLinksCells = node.querySelectorAll('td.issuelinks');
                            issueLinksCells.forEach(cell => removeWikiPageLinks(cell));
                        }
                    });
                }
            }
        });

        observer.observe(targetNode, config);
    }

    function removeWikiLinks() {
        const issueLinksCells = document.querySelectorAll('td.issuelinks');
        issueLinksCells.forEach(cell => {
            const childNodes = Array.from(cell.childNodes);
            for (let i = childNodes.length - 1; i >= 0; i--) {
                const node = childNodes[i];
                if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A' && node.href.includes('ker-l-jirapp02p.unity.media.corp')) {

                    node.remove();

                    if (i > 0 && childNodes[i - 1].nodeType === Node.TEXT_NODE) {
                        const previousTextNode = childNodes[i - 1];
                        previousTextNode.textContent = previousTextNode.textContent.replace(/,\s*$/, '');
                        if (previousTextNode.textContent.trim() === '') {
                            previousTextNode.remove();
                        }
                    }
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeDOM);
    } else {
        observeDOM();
    }

    removeWikiLinks();

})();
