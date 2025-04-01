// ==UserScript==
// @name         Hauptskript zum entfernen der Wiki Page Links in Jira
// @namespace    none
// @version      1.0.5
// @description  Entfernt Wiki Page Links in Jira
// @include      https://nd-jira.unity.media.corp/*
// @grant        GM.xmlHttpRequest
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RemoveWikiPage.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RemoveWikiPage.js
// @noframes
// ==/UserScript==
(function() {
    'use strict';
    
    // Kombinierte Funktion zum Entfernen der Wiki-Links
    function removeWikiPageLinks(cell) {
        if (!cell) return;
        
        // Text-Filter für Wiki-Links
        const isWikiPageLink = (node) => 
            node.nodeType === Node.ELEMENT_NODE && 
            node.tagName === 'A' && 
            (node.textContent.trim() === 'Wiki Page' || 
             node.href?.includes('ker-l-jirapp02p.unity.media.corp'));
        
        // Geht durch alle Knoten und markiert zu entfernende
        const childNodes = Array.from(cell.childNodes);
        const nodesToRemove = [];
        
        for (let i = 0; i < childNodes.length; i++) {
            const node = childNodes[i];
            
            if (isWikiPageLink(node)) {
                nodesToRemove.push(node);
                
                // Komma vor dem Link entfernen
                const previousSibling = node.previousSibling;
                if (previousSibling?.nodeType === Node.TEXT_NODE && previousSibling.textContent.trim() === ',') {
                    nodesToRemove.push(previousSibling);
                }
                
                // Komma nach dem Link entfernen
                const nextSibling = node.nextSibling;
                if (nextSibling?.nodeType === Node.TEXT_NODE && nextSibling.textContent.trim() === ',') {
                    const nextNextSibling = nextSibling.nextSibling;
                    if (!nextNextSibling || nextNextSibling.nodeType !== Node.ELEMENT_NODE) {
                        nodesToRemove.push(nextSibling);
                    }
                }
            }
        }
        
        // Entfernt alle markierten Knoten
        nodesToRemove.forEach(node => node.remove());
    }
    
    // DOM-Beobachter für dynamisch geladene Inhalte
    function observeDOM() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };
        
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType !== Node.ELEMENT_NODE) return;
                        
                        // Direkt prüfen, ob der hinzugefügte Knoten eine issuelinks-Zelle ist
                        if (node.matches('td.issuelinks')) {
                            removeWikiPageLinks(node);
                        }
                        
                        // Alle issuelinks-Zellen innerhalb des neuen Knotens finden
                        node.querySelectorAll('td.issuelinks').forEach(removeWikiPageLinks);
                    });
                }
            }
        });
        
        observer.observe(targetNode, config);
    }
    
    // Initiale Bereinigung vorhandener Links
    function cleanExistingLinks() {
        document.querySelectorAll('td.issuelinks').forEach(removeWikiPageLinks);
    }
    
    // Starte die Beobachtung, sobald das DOM bereit ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            cleanExistingLinks();
            observeDOM();
        });
    } else {
        cleanExistingLinks();
        observeDOM();
    }
})();
