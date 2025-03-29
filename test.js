// ==UserScript==
// @name         Unified Jira Physical Browser Integration
// @version      2025-03-28
// @description  Conditionally add button and handle map interactions
// @author       You
// @match        https://nd-jira.unity.media.corp/*
// @match        https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html*
// @grant        GM_openInTab
// @grant        GM.setValue
// @grant        GM.getValue
// @noframes
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const config = {
        apiUrl: 'https://nd-jira.unity.media.corp/rest/api/2/issue/',
        osmUrl: 'https://nominatim.openstreetmap.org/search?format=json',
        buttonText: 'Physical Browser',
        buttonTarget: '_blank',
        buttonClass: 'custom-button-class',
    };

    async function fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        return response.json();
    }

    async function getGPSData(plz, ort, strasse) {
        const osmUrl = `${config.osmUrl}&postalcode=${plz}&city=${ort}&street=${strasse}`;
        const osmData = await fetchData(osmUrl);
        if (osmData.length > 0) {
            const { lat, lon } = osmData[0];
            console.log("TOMMY - GPS Data:", lat, lon);
            return { lat, lon };
        } else {
            console.error("TOMMY - No GPS data found for the given address");
            return false;
        }
    }

    async function checkCondition(issueKey) {
        const apiUrl = `${config.apiUrl}${issueKey}`;
        try {
            const data = await fetchData(apiUrl);
            const assignee = data.fields.assignee;
            if (assignee) {
                console.log("TOMMY - Assignee found:", assignee.displayName);

                const { customfield_14413: plz, customfield_13702: ort, customfield_13700: strasse } = data.fields;
                console.log("TOMMY - PLZ:", plz);
                console.log("TOMMY - Ort:", ort);
                console.log("TOMMY - Straße:", strasse);

                if (plz && ort && strasse) {
                    return await getGPSData(plz, ort, strasse);
                } else {
                    console.error("TOMMY - Missing address fields");
                    return false;
                }
            } else {
                console.log("TOMMY - No assignee found");
                return false;
            }
        } catch (error) {
            console.error("TOMMY - Error in checkCondition:", error);
            return false;
        }
    }

    function extractIssueKey(url) {
        const match = url.match(/ANDE-\d+/);
        return match ? match[0] : null;
    }

    async function addButton() {
        console.log("TOMMY - Before attempting to attach event listener");
        var currentURL = window.location.href;
        var issueKey = extractIssueKey(currentURL);
        console.log("TOMMY - Extracted issue key:", issueKey);

        if (issueKey) {
            const gpsData = await checkCondition(issueKey);
            console.log("TOMMY - GPS Data:", gpsData);
            if (gpsData) {
                const { lat, lon } = gpsData;

                const newLi = document.createElement('li');
                const link = document.createElement('a');
                link.href = `https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html#/map/${lat},${lon},20z`;
                link.textContent = config.buttonText;
                link.target = config.buttonTarget;
                link.className = config.buttonClass;
                newLi.appendChild(link);
                console.log("TOMMY - Created new list item and link (button will be added)");

                // Verwende GM_openInTab, um den Tab im Hintergrund zu öffnen
                link.addEventListener('click', function(event) {
                    event.preventDefault();
                    GM_openInTab(this.href, true);
                    console.log("TOMMY - Opened link in background tab");
                });

                const ul = document.querySelector('ul.aui-nav');
                console.log("TOMMY - ul.aui-nav element:", ul);
                if (ul) {
                    const lastLi = ul.querySelector('li:last-of-type');
                    console.log("TOMMY - lastLi element:", lastLi);
                    if (lastLi) {
                        ul.insertBefore(newLi, lastLi.nextSibling);
                        console.log("TOMMY - Inserted new list item before last list item");
                    } else {
                        ul.appendChild(newLi);
                        console.error("TOMMY - Appended new list item to ul.aui-nav");
                    }
                } else {
                    console.error("TOMMY - Could not find element ul.aui-nav");
                }
            } else {
                console.log("TOMMY - Conditions not met to add button.");
            }
        } else {
            console.log("TOMMY - No issue key found in URL, not checking assignee.");
        }
    }

    function removeButton() {
        const existingButton = document.querySelector(`.${config.buttonClass}`);
        if (existingButton) {
            existingButton.parentElement.remove();
            console.log("TOMMY - Existing button removed");
        }
    }

    // Überwache Änderungen der URL
    let lastUrl = location.href;
    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log("TOMMY - URL changed:", currentUrl);
            removeButton();
            addButton();
        }
    }).observe(document, { subtree: true, childList: true });

    window.addEventListener('load', () => {
        removeButton();
        addButton();
    });

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
            if (fieldName === 'zip_code' && !document.querySelector(fieldSelector)) {
                fieldSelector = '[name="zip_code"]';
            }
            if (fieldName === 'street_name' && !document.querySelector(fieldSelector)) {
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
            if (fieldName === 'zip_code' && !document.querySelector(fieldSelector)) {
                fieldSelector = '[name="zip_code"]';
            }
            if (fieldName === 'street_name' && !document.querySelector(fieldSelector)) {
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
            console.error('TOMMY - GM.setValue is not available.');
        }
    }

    const targetSelector = 'div#map-alert';

    const checkAndReload = () => {
        const targetElement = document.querySelector(targetSelector);

        if (!targetElement) {
            return;
        }

        const isVisible = targetElement.offsetParent !== null && window.getComputedStyle(targetElement).visibility !== 'hidden';
        const hasTargetText = targetElement.textContent.includes("Nicht authentifizierter Zugriff auf Kartendaten.");

        if (isVisible && hasTargetText) {
            location.reload();
        }
    };

    if (window.location.href.includes('https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html')) {

        (document.readyState === 'complete' || document.readyState === 'interactive' ? checkAndReload : window.addEventListener('DOMContentLoaded', checkAndReload));

        setInterval(checkAndReload, 1000);

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
                console.error('TOMMY - Not enough layer-visibility elements found.');
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
                console.error('TOMMY - No values found in GM.getValue(\'customFieldValues\')');
            }
        });
    }

})();
