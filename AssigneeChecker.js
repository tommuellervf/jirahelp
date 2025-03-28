// ==UserScript==
// @name         Zuweisung Link abfangen und prüfen
// @namespace    none
// @version      1.0.3
// @description  Prüfung, ob Maßnahme bereits zugewiesen ist.
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AssigneeChecker.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AssigneeChecker.js
// @match        https://nd-jira.unity.media.corp/*
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    async function checkCondition(issueKey) {
        const apiUrl = `https://nd-jira.unity.media.corp/rest/api/2/issue/${issueKey}`;
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            const assignee = data.fields.assignee;
            if (assignee) {
                return showModal(`Die Maßnahme ist bereits in Bearbeitung durch:<br><br><b>${assignee.displayName}</b><br><br>Möchten Sie die Maßnahme übernehmen?`);
            } else {
                return true;
            }
        } catch (error) {
            return false;
        }
    }

    function showModal(message) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.backgroundColor = 'white';
            modal.style.padding = '20px';
            modal.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
            modal.style.zIndex = '10000';

            const messageDiv = document.createElement('div');
            messageDiv.innerHTML = message;
            modal.appendChild(messageDiv);

            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '20px';
            buttonContainer.style.textAlign = 'right';

            const okButton = document.createElement('button');
            okButton.textContent = 'OK';
            okButton.onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };
            buttonContainer.appendChild(okButton);

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Abbrechen';
            cancelButton.style.marginLeft = '10px';
            cancelButton.onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };
            buttonContainer.appendChild(cancelButton);

            modal.appendChild(buttonContainer);
            document.body.appendChild(modal);
        });
    }

    function extractIssueKey(url) {
        const match = url.match(/ANDE-\d+/);
        return match ? match[0] : null;
    }

    document.addEventListener('click', async function(event) {
        var target = event.target;

        if (target.tagName === 'A' && target.href.startsWith("https://nd-jira.unity.media.corp/secure/AssignIssue.jspa")) {
            event.preventDefault();
            event.stopImmediatePropagation();

            var currentURL = window.location.href;
            var issueKey = extractIssueKey(currentURL);

            if (issueKey) {
                const shouldProceed = await checkCondition(issueKey);
                if (shouldProceed) {
                    window.location.href = target.href;
                }
            }
        }
    }, true);
})();
