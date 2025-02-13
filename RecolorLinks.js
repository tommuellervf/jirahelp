// ==UserScript==
// @name         Hauptskript zum ändern der Farbe der Links in Jira
// @namespace    none
// @version      1.0.0
// @description  Ändert Farbe der Links in Jira
// @include      https://nd-jira.unity.media.corp/*
// @grant        GM.xmlHttpRequest
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RecolorLinks.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RecolorLinks.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    if (typeof GM_addStyle === 'undefined') {
        alert('Please enable the "GM_addStyle" permission for this script to work.');
        return;
    }

    document.body.id = 'jira-link-colorizer';
    const css = `
  #jira-link-colorizer td.issuelinks a {

  }
  #jira-link-colorizer td.issuelinks a[href*="EXTDL"] {
    color: red !important;
    font-weight: bold !important;
  }
  #jira-link-colorizer td.issuelinks a[href*="LINIE"] {
    color: green !important;
    font-weight: bold !important;
  }
  #jira-link-colorizer td.issuelinks a[href*="SER"] {
    color: blue !important;
    font-weight: bold !important;
  }
    `;
    GM_addStyle(css);
})();
