// ==UserScript==
// @name         Autofill Abnahme Plan
// @namespace    none
// @version      1.0.6
// @description  Füllt Abnahme Plan Datum
// @include      https://nd-jira.unity.media.corp/*
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillAbnahmePlanDate.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillAbnahmePlanDate.js
// @grant        GM.xmlHttpRequest
// @noframes
// ==/UserScript==

(function() {
  'use strict';

  function getDatePlus21Days(dateString) {
    const dateMatch = dateString.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!dateMatch) return null;
    const [_, day, month, year] = dateMatch;
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 21);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function fillCustomField(newDate) {
    const inputElement = document.querySelector('#customfield_13602');
    if (!inputElement) return;
    inputElement.value = newDate;
    const changeEvent = new Event('change', { bubbles: true });
    inputElement.dispatchEvent(changeEvent);
    const hiddenInputElement = document.querySelector(`input[type="hidden"][name="${inputElement.name}"]`);
    if (hiddenInputElement) {
      hiddenInputElement.value = newDate;
      hiddenInputElement.dispatchEvent(changeEvent);
    }
  }

  function selectDropdownOption() {
    const customfield11904Select = document.querySelector('#customfield_11904');
    if (!customfield11904Select) return;
    for (let i = 0; i < customfield11904Select.options.length; i++) {
      if (customfield11904Select.options[i].value === '21455') {
        customfield11904Select.selectedIndex = i;
        break;
      }
    }
  }

  function fillCustomFieldAndSelectDropdown() {
    const customfield23606ValueElement = document.querySelector('#customfield_23606-val span');
    if (!customfield23606ValueElement) return;
    const dateValue = customfield23606ValueElement.textContent.trim();
    const newDate = getDatePlus21Days(dateValue);
    if (newDate) {
      fillCustomField(newDate);
      selectDropdownOption();

      for (let i = 0; i <= 20; i++) {
        const datePickerDialog = document.getElementById(`date-picker${i}`);
        if (datePickerDialog) {
          datePickerDialog.remove();
        }
      }
    }
  }

  function waitForElements(selectors, callback) {
    const elements = selectors.map(selector => document.querySelector(selector));
    if (elements.every(element => element)) {
      callback(...elements);
    } else {
      setTimeout(() => waitForElements(selectors, callback), 100);
    }
  }

  let dialogObserver = null;

  function handleDialogOpen(dialog) {
    fillCustomFieldAndSelectDropdown();

    dialogObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          fillCustomFieldAndSelectDropdown();
        }
      });
    });
    dialogObserver.observe(dialog, { childList: true, subtree: true });
  }

  function handleDialogClose() {
    if (dialogObserver) {
      dialogObserver.disconnect();
      dialogObserver = null;
    }

    waitForElements(['#workflow-transition-221-dialog', '#issue-workflow-transition-submit'], (dialog, form) => {
      handleDialogOpen(dialog);

      const dialogRemovalObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
            if (mutation.removedNodes[0] === dialog) {
              handleDialogClose();
              dialogRemovalObserver.disconnect();
            }
          }
        });
      });
      dialogRemovalObserver.observe(dialog.parentElement, { childList: true });
    });
  }
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        const dialog = document.querySelector('#workflow-transition-221-dialog');
        if (dialog) {
          waitForElements(['#issue-workflow-transition-submit'], form => {
            handleDialogOpen(dialog);

            const dialogRemovalObserver = new MutationObserver(mutations => {
              mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                  if (mutation.removedNodes[0] === dialog) {
                    handleDialogClose();
                    dialogRemovalObserver.disconnect();
                  }
                }
              });
            });
            dialogRemovalObserver.observe(dialog.parentElement, { childList: true });
          });
          observer.disconnect();
        }
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

})();
