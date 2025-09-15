// ==UserScript==
// @name         Hauptskript zum entfernen der Wiki Page Links in Jira
// @namespace    none
// @version      1.0.9
// @description  Entfernt Wiki Page Links in Jira
// @include      https://nd-jira.unity.media.corp/*
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RemoveWikiPage.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RemoveWikiPage.js
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    const isWikiPageLink = (node) => {
        try {
            return node.nodeType === Node.ELEMENT_NODE &&
                   node.tagName === 'A' &&
                   (node.textContent.trim() === 'Wiki Page' ||
                    /ker-l-jirapp\d+p\.unity\.media\.corp/.test(node.href));
        } catch (e) {
            console.error('Error checking Wiki Page link:', e);
            return false;
        }
    };

    function removeWikiPageLinks(container) {
        if (!container || !container.querySelectorAll) return;

        try {
            const links = container.querySelectorAll('a');
            links.forEach(link => {
                if (!isWikiPageLink(link)) return;

                const nodesToRemove = [link];

                const previousSibling = link.previousSibling;
                if (previousSibling?.nodeType === Node.TEXT_NODE && previousSibling.textContent.trim() === ',') {
                    nodesToRemove.push(previousSibling);
                }

                const nextSibling = link.nextSibling;
                if (nextSibling?.nodeType === Node.TEXT_NODE && nextSibling.textContent.trim() === ',') {
                    const nextNextSibling = nextSibling.nextSibling;
                    if (!nextNextSibling || nextNextSibling.nodeType !== Node.ELEMENT_NODE) {
                        nodesToRemove.push(nextSibling);
                    }
                }

                nodesToRemove.forEach(node => node.remove());
            });
        } catch (e) {
            console.error('Error removing Wiki Page links:', e);
        }
    }

    function observeDOM() {
        const targetNode = document.querySelector('#content') || document.body;
        const config = { childList: true, subtree: true };

        const observer = new MutationObserver((mutationsList) => {
            try {
                for (const mutation of mutationsList) {
                    if (mutation.type !== 'childList') continue;

                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType !== Node.ELEMENT_NODE) return;

                        if (node.matches('td.issuelinks, div.link-group')) {
                            removeWikiPageLinks(node);
                        }
                        node.querySelectorAll('td.issuelinks, div.link-group').forEach(removeWikiPageLinks);
                    });
                }
            } catch (e) {
                console.error('Error in MutationObserver:', e);
            }
        });

        observer.observe(targetNode, config);
    }

    function cleanExistingLinks() {
        try {
            document.querySelectorAll('td.issuelinks, div.link-group').forEach(removeWikiPageLinks);
        } catch (e) {
            console.error('Error cleaning existing links:', e);
        }
    }

    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                cleanExistingLinks();
                observeDOM();
            });
        } else {
            cleanExistingLinks();
            observeDOM();
        }
    } catch (e) {
        console.error('Error initializing script:', e);
    }
})();
