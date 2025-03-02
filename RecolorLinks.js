// ==UserScript==
// @name         Hauptskript zum ändern der Farbe der Links in Jira
// @namespace    none
// @version      1.0.2
// @description  Ändert Farbe der Links in Jira
// @include      https://nd-jira.unity.media.corp/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RecolorLinks.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RecolorLinks.js
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // Set body class for easier styling
    document.body.classList.add('jira-link-colorizer');

    // Apply CSS styles directly to the DOM
    const style = document.createElement('style');
    style.textContent = `
        .jira-link-colorizer td.issuelinks a {
            /* Default link styles if needed */
        }
        .jira-link-colorizer td.issuelinks a[href*="EXTDL"] {
            color: red !important;
            font-weight: bold !important;
        }
        .jira-link-colorizer td.issuelinks a[href*="LINIE"] {
            color: green !important;
            font-weight: bold !important;
        }
        .jira-link-colorizer td.issuelinks a[href*="SER"] {
            color: blue !important;
            font-weight: bold !important;
        }
        .jira-link-colorizer td.issuelinks a[href*="ANDE"] {
            color: pink !important;
            font-weight: bold !important;
        }
    `;
    document.head.appendChild(style);
})();
