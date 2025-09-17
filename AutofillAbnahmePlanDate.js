// ==UserScript==
// @name         Autofill Abnahme Plan, Abnahme & Abschluss Dates
// @namespace    none
// @version      1.0.13
// @description  Füllt Abnahme Plan Datum, Abnahme Datum & Abschluss Daten
// @include      https://nd-jira.unity.media.corp/*
// @updateURL    https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillAbnahmePlanDate.js
// @downloadURL  https://raw.githubusercontent.com/tommuellervf/jirahelp/main/AutofillAbnahmePlanDate.js
// @grant        GM.xmlHttpRequest
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    function calculateDate(daysToAdd, dateString = null) {
        let startDate;
        if (dateString) {
            const dateMatch = dateString.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
            if (!dateMatch) return null;
            const [_, day, month, year] = dateMatch;
            startDate = new Date(year, month - 1, day);
        } else {
            startDate = new Date();
        }
        const futureDate = new Date(startDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        const day = String(futureDate.getDate()).padStart(2, '0');
        const month = String(futureDate.getMonth() + 1).padStart(2, '0');
        const year = futureDate.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function fillDateFieldDialog781(dialogSelector, textFieldSelector, daysToAdd) {
        const dialog = document.querySelector(dialogSelector);
        const content = dialog.querySelector('.jira-dialog-content');
        const textField = content.querySelector(textFieldSelector);
        const formattedDate = calculateDate(daysToAdd);
        textField.value = formattedDate;

        ['input', 'change', 'blur'].forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            textField.dispatchEvent(event);
        });

        const auiEvent = new Event('aui:change', { bubbles: true });
        textField.dispatchEvent(auiEvent);

        const hiddenInput = document.querySelector(`input[type="hidden"][name="${textField.name}"]`);
        if (hiddenInput) {
            hiddenInput.value = formattedDate;
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function fillCustomField(fieldSelector, newDate) {
        const inputElement = document.querySelector(fieldSelector);
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
        const config = {
            dropdowns: [
                { field: 'customfield_24908', value: 'Sonstiges' },
                { field: 'customfield_24909', value: 'Partner' }
            ],
            textarea: { field: '#customfield_11900', value: 'Terminanpassung' }
        };

        config.dropdowns.forEach(function(item) {
            const select = document.querySelector(`label[for="${item.field}"]`)
            ?.closest('.field-group')
            ?.querySelector('select[id*="connect-select-wrapper"]');
            if (select) {
                select.value = item.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        const textArea = document.querySelector(config.textarea.field);
        if (textArea) {
            textArea.value = config.textarea.value;
            ['input', 'change'].forEach(function(event) {
                textArea.dispatchEvent(new Event(event, { bubbles: true }));
            });
        }
    }

    function removeDatePickerDialogs() {
        const datePickerDialogs = document.querySelectorAll('aui-inline-dialog[id^="date-picker"]');
        datePickerDialogs.forEach(function(datePickerDialog) {
            datePickerDialog.remove();
        });
    }

    function fillTransition221Dialog(dialog) {
        const submitButton = document.querySelector('#issue-workflow-transition-submit');
        if (dialog && submitButton) {
            const customfield23606ValueElement = document.querySelector('#customfield_23606-val span');
            if (!customfield23606ValueElement) return;
            const dateValue = customfield23606ValueElement.textContent.trim();
            const newDate = calculateDate(21, dateValue);
            if (newDate) {
                removeDatePickerDialogs();
                fillCustomField('#customfield_13602', newDate);
                selectDropdownOption();
            }
        }
    }

    function fillTransition101Dialog(dialog) {
        const submitButton = document.querySelector('#issue-workflow-transition-submit');
        if (dialog && submitButton) {
            const formattedCurrentDate = calculateDate(0);
            fillCustomField('#customfield_13601', formattedCurrentDate);
            fillCustomField('#customfield_13613', formattedCurrentDate);
        }
    }

    function waitForElements(selectors, callback) {
        const elements = selectors.map(function(selector) { return document.querySelector(selector); });
        if (elements.every(function(element) { return element; })) {
            callback(...elements);
        } else {
            setTimeout(function() { waitForElements(selectors, callback); }, 100);
        }
    }

    function handleDialog(dialogSelector, onOpenCallback, onCloseCallback) {
        let dialogObserver = null;
        const dialog = document.querySelector(dialogSelector);
        let isFirstOpen = true;

        if (dialog) {
            dialogObserver = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        if (isFirstOpen) {
                            if (onOpenCallback) {
                                onOpenCallback(dialog);
                            }
                            isFirstOpen = false;
                            dialogObserver.disconnect();
                        }
                    }
                    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                        if (mutation.removedNodes[0] === dialog) {
                            if (onCloseCallback) {
                                onCloseCallback();
                            }
                            dialogObserver.disconnect();
                        }
                    }
                });
            });
            dialogObserver.observe(dialog, { childList: true, subtree: true });
        }
    }

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                const dialog101 = document.querySelector('#workflow-transition-101-dialog');
                const dialog221 = document.querySelector('#workflow-transition-221-dialog');
                const dialog781 = document.querySelector('#workflow-transition-781-dialog');

                if (dialog101) {
                    waitForElements(['#issue-workflow-transition-submit'], function(form) {
                        removeDatePickerDialogs();
                        handleDialog('#workflow-transition-101-dialog', fillTransition101Dialog, function() {});
                    });
                }

                if (dialog221) {
                    waitForElements(['#issue-workflow-transition-submit'], function(form) {
                        handleDialog('#workflow-transition-221-dialog', fillTransition221Dialog, function() {});
                    });
                }

                if (dialog781) {
                    waitForElements(['#issue-workflow-transition-submit', 'input#customfield_25452'], function(form, textField) {
                        fillDateFieldDialog781('#workflow-transition-781-dialog', 'input#customfield_25452', 14);
                    });
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
