// ==UserScript==
// @name          Jira - Physical Browser Integration
// @version       1.0.0
// @description   Jira - Physical Browser Integration
// @match         https://nd-jira.unity.media.corp/*
// @match         https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html*
// @updateURL     https://raw.githubusercontent.com/tommuellervf/jirahelp/main/JiraPhysicalBrowserIntegration.js
// @downloadURL   https://raw.githubusercontent.com/tommuellervf/jirahelp/main/JiraPhysicalBrowserIntegration.js
// @grant         GM_openInTab
// @grant         GM.setValue
// @grant         GM.getValue
// @noframes
// @run-at document-end
// ==/UserScript==

(function() {

    'use strict';

    const config = {
        apiUrl: 'https://nd-jira.unity.media.corp/rest/api/2/issue/',
        osmUrl: 'https://nominatim.openstreetmap.org/search?format=json',
        PBbuttonText: 'Physical Browser',
        PBbuttonTarget: '_blank',
        PBbuttonClass: 'custom-button-class',
        GHbuttonText: 'GeoHack',
        GHbuttonTarget: '_blank',
        GHbuttonClass: 'custom-button-class',
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
            if (plz && ort) {
                config.plz = plz;
                config.ort = ort;
                if (strasse) {
                    config.strasse = strasse.replace(/straße/gi, 'str.').replace(/strasse/gi, 'str.');
                } else {
                    config.strasse = null;
                }
                await GM.setValue('customFieldValues', { plz, ort, strasse: config.strasse });
                return { plz, ort, strasse: config.strasse };
            } else {
                console.error("TOMMY - Missing address fields");
                return null;
            }
        }
        return null;
    }

    let osmUrl

    async function getGPSData(plz, ort, strasse) {

        if (strasse) {
            osmUrl = `${config.osmUrl}&postalcode=${plz}&city=${ort}&street=${strasse}`;
        } else {
            osmUrl = `${config.osmUrl}&postalcode=${plz}&city=${ort}`;
        }
        let attempts = 0;
        const maxAttempts = 5;

        console.log("TOMMY - PLZ:", plz);
        console.log("TOMMY - Ort:", ort);
        console.log("TOMMY - Strasse:", strasse);

        while (attempts < maxAttempts) {
            try {

                const osmData = await fetchData(osmUrl);
                if (osmData && osmData.length > 0) {
                    const { lat, lon } = osmData[0];
                    return { lat, lon };
                } else {
                    console.error(`TOMMY - Attempt ${attempts + 1}: No GPS data found for the given address`);
                }
            } catch (error) {
                console.error(`TOMMY - Attempt ${attempts + 1}: Error fetching GPS data -`, error);
            }
            attempts++;
        }

        console.error("TOMMY - Max attempts reached: No GPS data found for the given address");
        return null;
    }

    async function checkCondition(issueKey) {
        const data = await fetchData(`${config.apiUrl}${issueKey}`);
        if (data) {
            const { assignee, customfield_14413: plz, customfield_13702: ort, customfield_13700: strasse } = data.fields;
            if (assignee && plz && ort) {
                return await getGPSData(plz, ort, strasse);
            } else {
                console.error("TOMMY - Missing address fields or assignee");
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
            console.error("TOMMY - " & gpsData);
            if (gpsData) {
                const { lat, lon } = gpsData;
                var geohackURL = generateGeoHackURL(lat, lon);

                const PBnewLi = document.createElement('li');
                const PBlink = document.createElement('a');
                PBlink.href = `https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html#/map/${lat},${lon},20z`;
                PBlink.textContent = config.PBbuttonText;
                PBlink.target = config.PBbuttonTarget;
                PBlink.className = config.PBbuttonClass;
                PBnewLi.appendChild(PBlink);
                PBlink.addEventListener('click', function(event) {
                    event.preventDefault();
                    GM_openInTab(this.href, true);
                });

                const geoHackLi = document.createElement('li');
                const geoHackLink = document.createElement('a');
                geoHackLink.href = geohackURL;
                geoHackLink.textContent = config.GHbuttonText;
                geoHackLink.target = config.GHbuttonTarget;
                geoHackLink.className = config.GHbuttonClass;
                geoHackLink.addEventListener('click', function(event) {
                    event.preventDefault();
                    GM_openInTab(this.href, true);
                });
                geoHackLi.appendChild(geoHackLink);

                const ul = document.querySelector('ul.aui-nav');
                if (ul) {
                    const separator = document.createElement('span');
                    separator.style.marginLeft = '10px';
                    ul.insertBefore(separator, PBnewLi.nextSibling);
                    ul.appendChild(PBnewLi);
                    ul.appendChild(geoHackLi);
                } else {
                    console.error("TOMMY - Could not find element ul.aui-nav");
                }
            }
        }
    }

    function convertToDMS(degrees) {
        var d = Math.floor(degrees);
        var m = Math.floor((degrees - d) * 60);
        var s = Math.round((degrees - d - m / 60) * 3600);
        return { d: d, m: m, s: s };
    }

    function generateGeoHackURL(lat, lon) {
        var latDMS = convertToDMS(Math.abs(lat));
        var lonDMS = convertToDMS(Math.abs(lon));

        var latDir = lat >= 0 ? 'N' : 'S';
        var lonDir = lon >= 0 ? 'E' : 'W';

        var url = `https://geohack.toolforge.org/geohack.php?params=${latDMS.d}_${latDMS.m}_${latDMS.s}_${latDir}_${lonDMS.d}_${lonDMS.m}_${lonDMS.s}_${lonDir}`;
        return url;
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
