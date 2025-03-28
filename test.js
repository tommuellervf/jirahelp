// ==UserScript==
// @name         Zuweisung Link abfangen und prüfen
// @namespace    none
// @version      1.1.1
// @description  Prüfung, ob Maßnahme bereits zugewiesen ist.
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/test.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/test.js
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
            modal.style.background = 'rgba(0, 0, 0, 0.7)'; // Halbtransparenter dunkler Hintergrund
            modal.style.borderRadius = '15px'; // Abgerundete Ecken
            modal.style.padding = '20px';
            modal.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)'; // Leichter Schatten
            modal.style.zIndex = '10000';
            modal.style.color = 'white'; // Weißer Text
            modal.style.fontFamily = 'Arial, sans-serif'; // Schriftart
            modal.style.maxWidth = '400px'; // Maximale Breite
            modal.style.width = '90%'; // Responsive Breite
            modal.style.textAlign = 'center'; // Text zentriert

            // Hintergrund-Overlay für den Body
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'linear-gradient(135deg, #1e3c72, #2a5298)'; // Farbverlauf wie in der Grafik
            overlay.style.zIndex = '9999';
            document.body.appendChild(overlay);

            const messageDiv = document.createElement('div');
            messageDiv.innerHTML = message;
            messageDiv.style.fontSize = '1em'; // Schriftgröße für den Text
            messageDiv.style.lineHeight = '1.5'; // Zeilenabstand
            modal.appendChild(messageDiv);

            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '20px';
            buttonContainer.style.textAlign = 'right';

            const okButton = document.createElement('button');
            okButton.textContent = 'OK';
            okButton.style.backgroundColor = '#007bff'; // Blauer Button
            okButton.style.color = 'white';
            okButton.style.border = 'none';
            okButton.style.padding = '8px 16px';
            okButton.style.borderRadius = '5px';
            okButton.style.cursor = 'pointer';
            okButton.style.fontSize = '1em';
            okButton.onmouseover = () => {
                okButton.style.backgroundColor = '#0056b3'; // Dunkleres Blau bei Hover
            };
            okButton.onmouseout = () => {
                okButton.style.backgroundColor = '#007bff';
            };
            okButton.onclick = () => {
                document.body.removeChild(modal);
                document.body.removeChild(overlay); // Overlay entfernen
                resolve(true);
            };
            buttonContainer.appendChild(okButton);

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Abbrechen';
            cancelButton.style.marginLeft = '10px';
            cancelButton.style.backgroundColor = '#dc3545'; // Roter Button
            cancelButton.style.color = 'white';
            cancelButton.style.border = 'none';
            cancelButton.style.padding = '8px 16px';
            cancelButton.style.borderRadius = '5px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.style.fontSize = '1em';
            cancelButton.onmouseover = () => {
                cancelButton.style.backgroundColor = '#b02a37'; // Dunkleres Rot bei Hover
            };
            cancelButton.onmouseout = () => {
                cancelButton.style.backgroundColor = '#dc3545';
            };
            cancelButton.onclick = () => {
                document.body.removeChild(modal);
                document.body.removeChild(overlay); // Overlay entfernen
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
