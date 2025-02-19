// ==UserScript==
// @name         Recolor Duedate
// @namespace    none
// @version      1.0.1
// @description  Recolor Duedate
// @include      https://nd-jira.unity.media.corp/*
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RecolorDuedate.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RecolorDuedate.js
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function() {
  'use strict';

  function styleDueDates() {
    const dueDateCells = Array.from(document.querySelectorAll('body#jira tr.issuerow td.duedate'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    dueDateCells.forEach(cell => {
      const dateText = cell.textContent.trim();
      const date = new Date(dateText);
      const isFuture = date > today;

      cell.style.textAlign = 'center';

      if (isFuture) {
        cell.style.backgroundColor = 'nothing';
      } else {
        cell.style.backgroundColor = '#ffa0a0';
      }
    });
  }

  styleDueDates();

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        styleDueDates();
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
