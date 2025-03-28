// ==UserScript==
// @name         Zuweisung Link abfangen und prüfen
// @namespace    none
// @version      1.0.5
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
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'rgba(30, 60, 114, 0.6)';
            overlay.style.backdropFilter = 'blur(2px)';
            overlay.style.zIndex = '9999';
            document.body.appendChild(overlay);

            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.background = 'rgba(0, 0, 0, 0.7)';
            modal.style.backdropFilter = 'blur(5px)';
            modal.style.borderRadius = '15px';
            modal.style.padding = '20px';
            modal.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
            modal.style.zIndex = '10000';
            modal.style.color = 'white';
            modal.style.fontFamily = '"-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Fira Sans", "Droid Sans", "Helvetica Neue", "sans-serif"';
            modal.style.maxWidth = '400px';
            modal.style.width = '90%';
            modal.style.textAlign = 'center';

            const messageDiv = document.createElement('div');
            messageDiv.innerHTML = message;
            messageDiv.style.fontSize = '1em';
            messageDiv.style.lineHeight = '1.5';
            modal.appendChild(messageDiv);

            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '20px';
            buttonContainer.style.textAlign = 'right';

            const okButton = document.createElement('button');
            okButton.textContent = 'OK';
            okButton.style.backgroundColor = '#007bff';
            okButton.style.color = 'white';
            okButton.style.border = 'none';
            okButton.style.padding = '8px 16px';
            okButton.style.borderRadius = '5px';
            okButton.style.cursor = 'pointer';
            okButton.style.fontSize = '1em';
            okButton.onmouseover = () => {
                okButton.style.backgroundColor = '#0056b3';
            };
            okButton.onmouseout = () => {
                okButton.style.backgroundColor = '#007bff';
            };
            okButton.onclick = () => {
                document.body.removeChild(modal);
                document.body.removeChild(overlay);
                resolve(true);
            };
            buttonContainer.appendChild(okButton);

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Abbrechen';
            cancelButton.style.marginLeft = '10px';
            cancelButton.style.backgroundColor = '#dc3545';
            cancelButton.style.color = 'white';
            cancelButton.style.border = 'none';
            cancelButton.style.padding = '8px 16px';
            cancelButton.style.borderRadius = '5px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.style.fontSize = '1em';
            cancelButton.onmouseover = () => {
                cancelButton.style.backgroundColor = '#b02a37';
            };
            cancelButton.onmouseout = () => {
                cancelButton.style.backgroundColor = '#dc3545';
            };
            cancelButton.onclick = () => {
                document.body.removeChild(modal);
                document.body.removeChild(overlay);
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
