// ==UserScript==
// @name Jira - Physical Browser Integration
// @version 1.0.0
// @description Jira - Physical Browser Integration
// @match https://nd-jira.unity.media.corp/*
// @match https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html*
// @grant GM_openInTab
// @grant GM.setValue
// @grant GM.getValue
// @noframes
// @run-at document-idle
// ==/UserScript==

(function() {

    'use strict';

    const config = {
        apiUrl: 'https://nd-jira.unity.media.corp/rest/api/2/issue/',
        osmUrl: 'https://nominatim.openstreetmap.org/search?format=json',
        buttonText: 'Physical Browser',
        buttonTarget: '_blank',
        buttonClass: 'custom-button-class',
        plz: null,
        ort: null,
        strasse: null
    };

    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
            return response.json();
        } catch (error) {
            console.error(`Error fetching data from ${url}:`, error);
            return null;
        }
    }

    async function getAddressData(issueKey) {
        const apiUrl = `${config.apiUrl}${issueKey}`;
        const data = await fetchData(apiUrl);
        if (data) {
            const { customfield_14413: plz, customfield_13702: ort, customfield_13700: strasse } = data.fields;
            if (plz && ort && strasse) {
                config.plz = plz;
                config.ort = ort;
                config.strasse = strasse.replace(/straße/gi, 'str.').replace(/strasse/gi, 'str.');
                await GM.setValue('customFieldValues', { plz, ort, strasse: config.strasse });
                return { plz, ort, strasse: config.strasse };
            } else {
                console.error("Missing address fields");
                return null;
            }
        }
        return null;
    }

    async function getGPSData(plz, ort, strasse) {
        const osmUrl = `${config.osmUrl}&postalcode=${plz}&city=${ort}&street=${strasse}`;
        const osmData = await fetchData(osmUrl);
        if (osmData && osmData.length > 0) {
            const { lat, lon } = osmData[0];
            return { lat, lon };
        } else {
            console.error("No GPS data found for the given address");
            return null;
        }
    }

    async function checkCondition(issueKey) {
        const data = await fetchData(`${config.apiUrl}${issueKey}`);
        if (data) {
            const { assignee, customfield_14413: plz, customfield_13702: ort, customfield_13700: strasse } = data.fields;
            if (assignee && plz && ort && strasse) {
                return await getGPSData(plz, ort, strasse);
            } else {
                console.error("Missing address fields or assignee");
                return null;
            }
        }
        return null;
    }

    function extractIssueKey(url) {
        const match = url.match(/ANDE-\d+/);
        return match ? match[0] : null;
    }

    async function addButton() {

        const issueKey = await extractIssueKey(window.location.href);

        if (window.location.href.startsWith('https://nd-jira.unity.media.corp/browse/')) {
            if (issueKey) {
                getAddressData(issueKey).then((values) => {
                    if (values) {
                        GM.setValue('customFieldValues', values);
                    }
                });
            }
        }

        if (issueKey) {
            const gpsData = await checkCondition(issueKey);
            if (gpsData) {
                const { lat, lon } = gpsData;
                const newLi = document.createElement('li');
                const link = document.createElement('a');
                link.href = `https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html#/map/${lat},${lon},20z`;
                link.textContent = config.buttonText;
                link.target = config.buttonTarget;
                link.className = config.buttonClass;
                newLi.appendChild(link);
                link.addEventListener('click', function(event) {
                    event.preventDefault();
                    GM_openInTab(this.href, true);
                });
                const ul = document.querySelector('ul.aui-nav');
                if (ul) {
                    ul.appendChild(newLi);
                } else {
                    console.error("Could not find element ul.aui-nav");
                }
            }
        }
    }

    function removeButton() {
        const existingButton = document.querySelector(`.${config.buttonClass}`);
        if (existingButton) {
            existingButton.parentElement.remove();
        }
    }

    function monitorUrlChanges() {
        let lastUrl = location.href;
        new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                removeButton();
                addButton();
            }
        }).observe(document, { subtree: true, childList: true });
    }

    window.addEventListener('load', () => {
        removeButton();
        addButton();
        monitorUrlChanges();
    });

    async function populateFields(values) {
        const fieldMappings = {
            'zip_code': 'plz',
            'city_name': 'ort',
            'street_name': 'strasse'
        };
        for (const fieldName in fieldMappings) {
            const fieldSelector = `[data-name="${fieldName}"], [name="${fieldName}"]`;
            const field = document.querySelector(fieldSelector);
            if (field) {
                const value = values[fieldMappings[fieldName]];
                if (value !== undefined) {
                    field.value = value;
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    }

    function areAllFieldsPresent() {
        const fieldSelectors = ['[data-name="zip_code"]', '[data-name="city_name"]', '[data-name="street_name"]'];
        return fieldSelectors.every(selector => document.querySelector(selector));
    }

    function onFieldsReady(values) {
        if (areAllFieldsPresent()) {
            populateFields(values);
        }
    }

    const targetSelector = 'div#map-alert';
    const checkAndReload = () => {
        const targetElement = document.querySelector(targetSelector);
        if (targetElement && targetElement.offsetParent !== null && window.getComputedStyle(targetElement).visibility !== 'hidden' && targetElement.textContent.includes("Nicht authentifizierter Zugriff auf Kartendaten.")) {
            location.reload();
        }
    };

    if (window.location.href.includes('https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html')) {
        (document.readyState === 'complete' || document.readyState === 'interactive' ? checkAndReload : window.addEventListener('DOMContentLoaded', checkAndReload));
        setInterval(checkAndReload, 1000);
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
                    const observer = new MutationObserver(() => {
                        if (areAllFieldsPresent()) {
                            observer.disconnect();
                            onFieldsReady(values);
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                }
            }
        });
    }

    async function waitForElement(selector) {
        return new Promise(resolve => {
            if (document.querySelectorAll(selector).length > 0) {
                return resolve(document.querySelectorAll(selector));
            }
            const observer = new MutationObserver(() => {
                if (document.querySelectorAll(selector).length > 0) {
                    resolve(document.querySelectorAll(selector));
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }
})();
