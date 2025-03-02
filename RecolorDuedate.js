// ==UserScript==
// @name         Recolor Duedate
// @namespace    none
// @version      1.0.3
// @description  Recolor Duedate
// @include      https://nd-jira.unity.media.corp/*
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RecolorDuedate.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/RecolorDuedate.js
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

(function() {
  'use strict';

  function parseDate(dateString) {
    const parts = dateString.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  }

  function styleDueDates() {
    const dueDateCells = Array.from(document.querySelectorAll('body#jira tr.issuerow td.duedate'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    dueDateCells.forEach(cell => {
      const dateText = cell.textContent.trim();
      const date = parseDate(dateText);

      if (!date) {
        console.error('Failed to parse date:', dateText);
        return;
      }

      const isPast = date <= today;

      cell.style.textAlign = 'center';

      if (isPast) {
        cell.style.backgroundColor = '#ffa0a0';
      }
      else
      {
        cell.style.backgroundColor = '#f8fff8';
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
