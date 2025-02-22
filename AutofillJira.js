// ==UserScript==
// @name         Jira Autofill
// @namespace    none
// @version      1.0.0
// @description  Kombiniertes Script für Abnahme Plan, Bauleiter und SAP Request Autofill
// @include      https://nd-jira.unity.media.corp/*
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillJira.js.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillJira.js.js
// @grant        GM.xmlHttpRequest
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // Gemeinsame Utility-Funktionen
    function dispatchCustomEvent(element, eventType) {
        const event = new Event(eventType, { bubbles: true });
        element.dispatchEvent(event);
    }

    // Abnahme Plan Funktionen
    function closeDatePickers() {
        // Erst nach dem spezifischen Dialog suchen
        const dialogPattern = /^date-picker\d+$/;
        const allElements = document.getElementsByTagName('*');
        
        // Alle Elemente durchsuchen, die dem Muster entsprechen
        Array.from(allElements)
            .filter(element => dialogPattern.test(element.id))
            .forEach(datePicker => datePicker.remove());
    }
    
    function fillAbnahmePlanFields() {
        const customfield23606ValueElement = document.querySelector('#customfield_23606-val span');
        if (!customfield23606ValueElement) return;
    
        const dateValue = customfield23606ValueElement.textContent.trim();
        const newDate = getDatePlus21Days(dateValue);
        
        if (newDate) {
            const inputElement = document.querySelector('#customfield_13602');
            if (inputElement) {
                inputElement.value = newDate;
                dispatchCustomEvent(inputElement, 'change');
                
                const hiddenInputElement = document.querySelector(`input[type="hidden"][name="${inputElement.name}"]`);
                if (hiddenInputElement) {
                    hiddenInputElement.value = newDate;
                    dispatchCustomEvent(hiddenInputElement, 'change');
                }
    
                // DatePicker erst schließen, nachdem das Datum gesetzt wurde
                setTimeout(closeDatePickers, 100);
            }
    
            const customfield11904Select = document.querySelector('#customfield_11904');
            if (customfield11904Select) {
                for (let i = 0; i < customfield11904Select.options.length; i++) {
                    if (customfield11904Select.options[i].value === '21455') {
                        customfield11904Select.selectedIndex = i;
                        break;
                    }
                }
            }
        }
    }

    // Bauleiter Funktionen
    function getBearbeiterName() {
        const parentElement = document.getElementById('assignee-val');
        if (parentElement) {
            const spanElement = parentElement.querySelector('span.user-hover.user-hover-replaced');
            if (spanElement) {
                const nameTextNode = Array.from(spanElement.childNodes)
                    .find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
                return nameTextNode ? nameTextNode.textContent.trim() : null;
            }
        }
        return null;
    }

    function waitForField(fieldSelector, maxAttempts = 10) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const checkField = () => {
                const field = document.querySelector(fieldSelector);
                if (field && field.getAttribute('aria-busy') !== 'true') {
                    resolve(field);
                } else if (attempts >= maxAttempts) {
                    reject(new Error(`Field ${fieldSelector} not ready after ${maxAttempts} attempts`));
                } else {
                    attempts++;
                    setTimeout(checkField, 500);
                }
            };
            checkField();
        });
    }
    
    async function fillBauleiterFields() {
        try {
            const inputField1 = document.querySelector('#customfield_12302-field');
            const inputField2 = document.querySelector('#customfield_12303-field');
            const bearbeiterName = getBearbeiterName();
    
            if (inputField1 && inputField2 && bearbeiterName) {
                // Erstes Feld füllen
                inputField1.value = bearbeiterName;
                dispatchCustomEvent(inputField1, 'input');
                
                // Tab drücken und auf Reaktion warten
                inputField1.dispatchEvent(new KeyboardEvent('keydown', { 
                    key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true, cancelable: true 
                }));
                
                // Warten auf zweites Feld
                await waitForField('#customfield_12303-field');
                
                // Zweites Feld füllen
                inputField2.value = bearbeiterName;
                dispatchCustomEvent(inputField2, 'input');
                
                inputField2.dispatchEvent(new KeyboardEvent('keydown', { 
                    key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true, cancelable: true 
                }));
            }
        } catch (error) {
            console.warn('Fehler beim Ausfüllen der Bauleiter-Felder:', error);
        }
    }

    // SAP Request Funktionen
    function waitForSAPFields(formFields, timeout = 30000) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
        const checkFields = () => {
            // Prüfe ob alle Felder vorhanden sind
            const allFieldsPresent = formFields.every(selector => document.querySelector(selector));
            
            // Prüfe ob alle Felder auch wirklich interagierbar sind
            const allFieldsReady = formFields.every(selector => {
                const field = document.querySelector(selector);
                return field && 
                       !field.disabled && 
                       field.getAttribute('aria-busy') !== 'true';
            });

            if (allFieldsPresent && allFieldsReady) {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout beim Warten auf SAP-Felder'));
            } else {
                setTimeout(checkFields, 500);
            }
        };
        
        checkFields();
    });
}

async function fillSAPFields() {
    const formFields = [
        'select#customfield_17300',
        'select#customfield_17301',
        '#customfield_14200',
        '#customfield_18201',
        '#customfield_18202',
        '#customfield_18203'
    ];

    try {
        await waitForSAPFields(formFields);
        
        // Statische Feldwerte setzen
        const fieldValues = {
            'customfield_17300': '20301',
            'customfield_17301': '20311',
            'customfield_18201': '2000',
            'customfield_18202': '2000',
            'customfield_18203': '2000'
        };

        for (const [fieldId, value] of Object.entries(fieldValues)) {
            const element = document.querySelector(`#${fieldId}`);
            if (element) {
                element.value = value;
                if (fieldId.startsWith('customfield_173')) {
                    dispatchCustomEvent(element, 'change');
                }
            }
        }

        // Datumsfeld setzen
        const customfield_14200 = document.querySelector('#customfield_14200');
        if (customfield_14200) {
            const today = new Date();
            const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, 1);
            const lastDayOfMonth = new Date(threeMonthsLater.getFullYear(), threeMonthsLater.getMonth() + 1, 0);
            
            const day = String(lastDayOfMonth.getDate()).padStart(2, '0');
            const month = String(lastDayOfMonth.getMonth() + 1).padStart(2, '0');
            const year = lastDayOfMonth.getFullYear();
            
            customfield_14200.value = `${day}.${month}.${year}`;
        }
    } catch (error) {
        console.warn('Fehler beim Ausfüllen der SAP-Felder:', error);
    }
}

    // Gemeinsame Observer-Logik
    function initializeObservers() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };
        
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Prüfe auf die verschiedenen Dialog-IDs
                    const abnahmePlanDialog = document.querySelector('#workflow-transition-221-dialog');
                    const bauleiterDialog = document.getElementById('workflow-transition-231-dialog');
                    const sapRequestDialog = document.getElementById('workflow-transition-151-dialog');

                    if (abnahmePlanDialog) {
                        fillAbnahmePlanFields();
                    }
                    if (bauleiterDialog) {
                        fillBauleiterFields();
                    }
                    if (sapRequestDialog) {
                        attemptFillSAPFields();
                    }
                }
            });
        });

        observer.observe(targetNode, config);

        // Event Listener für Dialog-Schließen
        document.addEventListener('click', function(event) {
            if (event.target.id === 'issue-workflow-transition-cancel') {
                initializeObservers();
            }
        });
    }

    // Initialisierung
    initializeObservers();
})();
