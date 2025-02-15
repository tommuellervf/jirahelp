// ==UserScript==
// @name         Autofill SAP Request
// @namespace    none
// @version      1.0.1
// @description  Füllt die SAP Nummer holen
// @include      https://nd-jira.unity.media.corp/*
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillSAPRequest.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillSAPRequest.js
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(function() {
    'use strict';

    function fillFormFields() {
        const customfield_17300 = document.querySelector('select#customfield_17300');
        const customfield_17301 = document.querySelector('select#customfield_17301');
        const customfield_14200 = document.querySelector('#customfield_14200');
        const customfield_18201 = document.querySelector('#customfield_18201');
        const customfield_18202 = document.querySelector('#customfield_18202');
        const customfield_18203 = document.querySelector('#customfield_18203');

        if (customfield_17300) {
            customfield_17300.value = '20301';
            customfield_17300.dispatchEvent(new Event('change'));
        }

        if (customfield_17301) {
            customfield_17301.value = '20311';
            customfield_17301.dispatchEvent(new Event('change'));
        }

        if (customfield_14200) {
            const today = new Date();
            const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, 1);
            const lastDayOfMonth = new Date(threeMonthsLater.getFullYear(), threeMonthsLater.getMonth() + 1, 0);
            const day = String(lastDayOfMonth.getDate()).padStart(2, '0');
            const month = String(lastDayOfMonth.getMonth() + 1).padStart(2, '0');
            const year = lastDayOfMonth.getFullYear();
            customfield_14200.value = `${day}.${month}.${year}`;
        }

        if (customfield_18201) {
            customfield_18201.value = '2000';
        }

        if (customfield_18202) {
            customfield_18202.value = '2000';
        }

        if (customfield_18203) {
            customfield_18203.value = '2000';
        }
    }

    function initializeObserver() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };

        const callback = function(mutationsList, observer) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const dialogElement = document.getElementById('workflow-transition-151-dialog');
                    if (dialogElement) {
                        observer.disconnect();
                        setTimeout(fillFormFields, 500);
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
