// ==UserScript==
// @name         PopulatePB
// @namespace    none
// @version      1.0.0
// @description  Adressdaten aus Jira nach PB übertragen
// @include      https://nd-jira.unity.media.corp/*
// @include      https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html*
// @grant        GM.setValue
// @grant        GM.getValue
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    const elementIds = ['customfield_14413-val', 'customfield_13702-val', 'customfield_13700-val'];
    const fieldSelectors = {
        'zip_code': '[data-name="zip_code"]',
        'city_name': '[data-name="city_name"]',
        'street_name': '[data-name="street_name"]'
    };
    const fieldIdMap = {
        'zip_code': 'customfield_14413-val',
        'city_name': 'customfield_13702-val',
        'street_name': 'customfield_13700-val'
    };

    function populateFields(values) {
        let allFieldsPopulated = true;
        for (const fieldName in fieldSelectors) {
            let fieldSelector = fieldSelectors[fieldName];
            if(fieldName === 'zip_code' && !document.querySelector(fieldSelector)){
                fieldSelector = '[name="zip_code"]';
            }
            if(fieldName === 'street_name' && !document.querySelector(fieldSelector)){
                fieldSelector = '[name="street_name"]';
            }
            const field = document.querySelector(fieldSelector);
            if (field) {
                const elementId = fieldIdMap[fieldName];
                const value = values[elementId];
                if (value !== undefined) {
                    field.value = value;
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    allFieldsPopulated = false;
                }
            } else {
                allFieldsPopulated = false;
            }
        }
    }

    function areAllFieldsPresent() {
        for (const fieldName in fieldSelectors) {
            let fieldSelector = fieldSelectors[fieldName];
            if(fieldName === 'zip_code' && !document.querySelector(fieldSelector)){
                fieldSelector = '[name="zip_code"]';
            }
            if(fieldName === 'street_name' && !document.querySelector(fieldSelector)){
                fieldSelector = '[name="street_name"]';
            }
            const field = document.querySelector(fieldSelector);
            if (!field) {
                return false;
            }
        }
        return true;
    }

    function onFieldsReady(values) {
        if (areAllFieldsPresent()) {
            populateFields(values);
        }
    }

    if (window.location.href.startsWith('https://nd-jira.unity.media.corp/browse/')) {
        const values = {};

        for (const id of elementIds) {
            const element = document.getElementById(id);
            if (element) {
                let textContent = element.textContent.trim();
                if (id === 'customfield_13700-val') {
                    textContent = textContent.replace(/straße/gi, 'str.').replace(/strasse/gi, 'str.');
                }
                values[id] = textContent;
            } else {
                values[id] = null;
            }
        }

        if (typeof GM !== 'undefined' && GM.setValue) {
            GM.setValue('customFieldValues', values).then(() => {
            });
        } else {
            console.error('GM.setValue is not available.');
        }
    }

    if (window.location.href.includes('https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html')) {

        function waitForElement(selector) {
            return new Promise(resolve => {
                if (document.querySelectorAll(selector).length > 0) {
                    return resolve(document.querySelectorAll(selector));
                }

                const observer = new MutationObserver(mutations => {
                    if (document.querySelectorAll(selector).length > 0) {
                        resolve(document.querySelectorAll(selector));
                        observer.disconnect();
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }

        waitForElement('span.layer-visibility').then((allLayerVisibilityElements) => {
            if (allLayerVisibilityElements.length >= 15) {
                allLayerVisibilityElements[1].click();
                allLayerVisibilityElements[14].click();
            } else {
                console.error('Not enough layer-visibility elements found.');
            }
        });


        GM.getValue('customFieldValues').then((values) => {
            if (values) {
                if (areAllFieldsPresent()) {
                    populateFields(values);
                } else {

                    const observer = new MutationObserver((mutations) => {
                        if (areAllFieldsPresent()) {
                            observer.disconnect();
                            onFieldsReady(values);
                        }
                    });

                    observer.observe(document.body, { childList: true, subtree: true });
                }
            } else {
                console.error('No values found in GM.getValue(\'customFieldValues\')');
            }
        });
    }
})();
