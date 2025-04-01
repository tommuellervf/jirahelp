// ==UserScript==
// @name         Zuweisung Link abfangen und prüfen
// @namespace    none
// @version      1.1.0
// @description  Prüfung, ob Maßnahme bereits zugewiesen ist.
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AssigneeChecker.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AssigneeChecker.js
// @match        https://nd-jira.unity.media.corp/*
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // Konfiguration
    const config = {
        jiraBaseUrl: 'https://nd-jira.unity.media.corp',
        apiPath: '/rest/api/2/issue/',
        assignPath: '/secure/AssignIssue.jspa',
        // Unterstützt auch andere Projekt-Präfixe als nur ANDE
        issueKeyPattern: /([A-Z]+-\d+)/
    };

    /**
     * Prüft, ob ein Issue bereits zugewiesen ist
     * @param {string} issueKey - Der JIRA Issue Key
     * @returns {Promise<boolean>} - True, wenn der Benutzer fortfahren möchte
     */
    async function checkAssignee(issueKey) {
        const apiUrl = `${config.jiraBaseUrl}${config.apiPath}${issueKey}`;
        
        try {
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API Fehler: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const assignee = data.fields.assignee;
            
            if (assignee) {
                return showModal(`Die Maßnahme ist bereits in Bearbeitung durch:<br><br><b>${assignee.displayName}</b><br><br>Möchten Sie die Maßnahme übernehmen?`);
            } else {
                return true; // Keine Zuweisung vorhanden, kann fortfahren
            }
        } catch (error) {
            console.error('Fehler beim Abrufen des Issues:', error);
            return showModal(`Fehler beim Prüfen der Zuweisung:<br><br>${error.message}<br><br>Möchten Sie trotzdem fortfahren?`);
        }
    }

    /**
     * Zeigt ein Modal-Dialog an
     * @param {string} message - Die anzuzeigende Nachricht (kann HTML enthalten)
     * @returns {Promise<boolean>} - True für OK, False für Abbrechen
     */
    function showModal(message) {
        return new Promise((resolve) => {
            // Styles für UI-Elemente
            const styles = {
                overlay: {
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    background: 'rgba(30, 60, 114, 0.6)',
                    backdropFilter: 'blur(2px)',
                    zIndex: '9999'
                },
                modal: {
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(5px)',
                    borderRadius: '15px',
                    padding: '20px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                    zIndex: '10000',
                    color: 'white',
                    fontFamily: '"-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Fira Sans", "Droid Sans", "Helvetica Neue", "sans-serif"',
                    maxWidth: '400px',
                    width: '90%',
                    textAlign: 'center'
                },
                button: {
                    base: {
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '1em'
                    },
                    ok: {
                        backgroundColor: '#007bff',
                        hoverColor: '#0056b3'
                    },
                    cancel: {
                        backgroundColor: '#dc3545',
                        hoverColor: '#b02a37',
                        marginLeft: '10px'
                    }
                }
            };

            // UI-Elemente erstellen
            const overlay = createElementWithStyles('div', styles.overlay);
            const modal = createElementWithStyles('div', styles.modal);
            
            // Nachricht hinzufügen
            const messageDiv = document.createElement('div');
            messageDiv.innerHTML = message;
            messageDiv.style.fontSize = '1em';
            messageDiv.style.lineHeight = '1.5';
            modal.appendChild(messageDiv);
            
            // Buttons Container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.marginTop = '20px';
            buttonContainer.style.textAlign = 'right';
            
            // OK Button
            const okButton = createButton('OK', {...styles.button.base, ...styles.button.ok}, () => {
                cleanupAndResolve(true);
            });
            
            // Cancel Button
            const cancelButton = createButton('Abbrechen', {...styles.button.base, ...styles.button.cancel}, () => {
                cleanupAndResolve(false);
            });
            
            buttonContainer.appendChild(okButton);
            buttonContainer.appendChild(cancelButton);
            modal.appendChild(buttonContainer);
            
            // Elemente zum DOM hinzufügen
            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            
            // Event-Listener für ESC-Taste
            const keyHandler = (e) => {
                if (e.key === 'Escape') {
                    cleanupAndResolve(false);
                }
            };
            document.addEventListener('keydown', keyHandler);
            
            // Aufräumen und Promise auflösen
            function cleanupAndResolve(result) {
                document.body.removeChild(modal);
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', keyHandler);
                resolve(result);
            }
        });
    }
    
    /**
     * Erzeugt ein Element mit angegebenen Styles
     * @param {string} tagName - HTML-Tag-Name
     * @param {Object} styles - Styles als Objekt
     * @returns {HTMLElement} - Das erzeugte Element
     */
    function createElementWithStyles(tagName, styles) {
        const element = document.createElement(tagName);
        Object.assign(element.style, styles);
        document.body.appendChild(element);
        return element;
    }
    
    /**
     * Erzeugt einen Button mit angegebenen Styles und Click-Handler
     * @param {string} text - Button-Text
     * @param {Object} styles - Styles als Objekt
     * @param {Function} clickHandler - Click-Handler
     * @returns {HTMLButtonElement} - Der erzeugte Button
     */
    function createButton(text, styles, clickHandler) {
        const button = document.createElement('button');
        button.textContent = text;
        Object.assign(button.style, styles);
        
        const baseColor = styles.backgroundColor;
        const hoverColor = styles.hoverColor;
        
        if (hoverColor) {
            button.onmouseover = () => {
                button.style.backgroundColor = hoverColor;
            };
            button.onmouseout = () => {
                button.style.backgroundColor = baseColor;
            };
        }
        
        button.onclick = clickHandler;
        return button;
    }

    /**
     * Extrahiert den Issue-Key aus einer URL
     * @param {string} url - Die zu prüfende URL
     * @returns {string|null} - Der extrahierte Issue-Key oder null
     */
    function extractIssueKey(url) {
        const match = url.match(config.issueKeyPattern);
        return match ? match[0] : null;
    }

    /**
     * Hängt sich an relevante Links an statt auf alle Klicks zu reagieren
     */
    function setupListeners() {
        // Spezifischer Event-Delegations-Ansatz
        document.addEventListener('click', async function(event) {
            // Findet den nächsten Link-Vorfahren oder das Ziel selbst, wenn es ein Link ist
            let target = event.target;
            while (target && target.tagName !== 'A') {
                target = target.parentElement;
                if (!target) return; // Kein Link-Vorfahre gefunden
            }
            
            // Prüft, ob es ein Zuweisungs-Link ist
            if (target.href && target.href.includes(config.assignPath)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                
                const currentURL = window.location.href;
                const issueKey = extractIssueKey(currentURL);
                
                if (issueKey) {
                    const shouldProceed = await checkAssignee(issueKey);
                    if (shouldProceed) {
                        window.location.href = target.href;
                    }
                } else {
                    console.warn('Konnte keinen Issue-Key aus der URL extrahieren:', currentURL);
                    // Trotzdem fortfahren, falls Issue-Key nicht gefunden wurde
                    window.location.href = target.href;
                }
            }
        }, true);
    }
    
    // Initialisiere das Script
    setupListeners();
})();
