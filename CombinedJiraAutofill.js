// ==UserScript==
// @name         Combined Jira Autofill
// @namespace    none
// @version      1.0.0
// @description  Kombiniertes Script für Abnahme Plan, Bauleiter und SAP Request Autofill
// @include      https://nd-jira.unity.media.corp/*
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/CombinedJiraAutofill.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/CombinedJiraAutofill.js
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
    function getDatePlus21Days(dateString) {
        const dateMatch = dateString.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (!dateMatch) return null;
        const [_, day, month, year] = dateMatch;
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + 21);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

            // Entferne DatePicker Dialoge
            for (let i = 0; i <= 20; i++) {
                const datePickerDialog = document.getElementById(`date-picker${i}`);
                if (datePickerDialog) {
                    datePickerDialog.remove();
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

    function fillBauleiterFields() {
        const inputField1 = document.querySelector('#customfield_12302-field');
        const inputField2 = document.querySelector('#customfield_12303-field');
        const bearbeiterName = getBearbeiterName();

        if (inputField1 && inputField2 && bearbeiterName) {
            inputField1.value = bearbeiterName;
            dispatchCustomEvent(inputField1, 'input');

            setTimeout(() => {
                inputField1.dispatchEvent(new KeyboardEvent('keydown', { 
                    key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true, cancelable: true 
                }));
            }, 500);

            setTimeout(() => {
                inputField2.value = bearbeiterName;
                dispatchCustomEvent(inputField2, 'input');

                setTimeout(() => {
                    inputField2.dispatchEvent(new KeyboardEvent('keydown', { 
                        key: 'Tab', code: 'Tab', keyCode: 9, which: 9, bubbles: true, cancelable: true 
                    }));
                }, 500);
            }, 1000);
        }
    }

    // SAP Request Funktionen
    function fillSAPFields() {
        const formFields = {
            'customfield_17300': '20301',
            'customfield_17301': '20311',
            'customfield_18201': '2000',
            'customfield_18202': '2000',
            'customfield_18203': '2000'
        };

        // Setze statische Feldwerte
        Object.entries(formFields).forEach(([fieldId, value]) => {
            const element = document.querySelector(`#${fieldId}`);
            if (element) {
                element.value = value;
                if (fieldId.startsWith('customfield_173')) {
                    dispatchCustomEvent(element, 'change');
                }
            }
        });

        // Setze Datum
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
    }

    function attemptFillSAPFields(maxAttempts = 10, delay = 500, currentAttempt = 1) {
        const formFields = [
            'select#customfield_17300',
            'select#customfield_17301',
            '#customfield_14200',
            '#customfield_18201',
            '#customfield_18202',
            '#customfield_18203'
        ];
        
        const allFieldsPresent = formFields.every(selector => document.querySelector(selector));
        
        if (allFieldsPresent) {
            fillSAPFields();
        } else if (currentAttempt <= maxAttempts) {
            setTimeout(() => {
                attemptFillSAPFields(maxAttempts, delay, currentAttempt + 1);
            }, delay);
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
