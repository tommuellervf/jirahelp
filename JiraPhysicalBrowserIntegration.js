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

    // Zentrale Konfiguration für bessere Wartbarkeit
    const config = {
        apiUrl: 'https://nd-jira.unity.media.corp/rest/api/2/issue/',
        osmUrl: 'https://nominatim.openstreetmap.org/search?format=json',
        buttons: {
            physicalBrowser: {
                text: 'Physical Browser',
                target: '_blank',
                class: 'custom-button-class'
            },
            geoHack: {
                text: 'GeoHack',
                target: '_blank',
                class: 'custom-button-class'
            }
        },
        addressData: {
            plz: null,
            ort: null,
            strasse: null
        },
        fieldMappings: {
            'zip_code': 'plz',
            'city_name': 'ort',
            'street_name': 'strasse'
        },
        selectors: {
            buttonContainer: 'ul.aui-nav',
            mapAlert: 'div#map-alert',
            layerVisibility: 'span.layer-visibility'
        },
        maxGpsAttempts: 5,
        checkInterval: 1000,
        separatorColors: {
            separator1: 'white'
        }
    };

    /**
     * Utility-Funktionen
     */
    // Fetch mit Error-Handling
    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching data from ${url}:`, error);
            return null;
        }
    }

    // Issue-Key aus URL extrahieren
    function extractIssueKey(url) {
        const match = url.match(/ANDE-\d+/);
        return match ? match[0] : null;
    }

    // Grad in DMS-Format umwandeln
    function convertToDMS(degrees) {
        const d = Math.floor(degrees);
        const m = Math.floor((degrees - d) * 60);
        const s = Math.round((degrees - d - m / 60) * 3600);
        return { d, m, s };
    }

    // PB-URL generieren
    function generatePBURL(lat, lon) {
        return `https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html#/map/${lat},${lon},20z`;
    }

    // GeoHack-URL generieren
    function generateGeoHackURL(lat, lon) {
        const latDMS = convertToDMS(Math.abs(lat));
        const lonDMS = convertToDMS(Math.abs(lon));
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        return `https://geohack.toolforge.org/geohack.php?params=${latDMS.d}_${latDMS.m}_${latDMS.s}_${latDir}_${lonDMS.d}_${lonDMS.m}_${lonDMS.s}_${lonDir}`;
    }

    // Auf Element warten
    async function waitForElement(selector) {
        return new Promise(resolve => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                return resolve(elements);
            }

            const observer = new MutationObserver(() => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    resolve(elements);
                    observer.disconnect();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    /**
     * Adressverarbeitung
     */
    // Adressdaten aus JIRA abrufen
    async function getAddressData(issueKey) {
        const data = await fetchData(`${config.apiUrl}${issueKey}`);
        if (!data) return null;

        const { customfield_14413: plz, customfield_13702: ort, customfield_13700: strasse } = data.fields;
        if (!plz || !ort) {
            console.error("TOMMY - Missing address fields");
            return null;
        }

        // Adressdaten aufbereiten
        const processedStrasse = strasse
        ? strasse.replace(/straße/gi, 'str.').replace(/strasse/gi, 'str.')
        : null;

        const addressData = {
            plz,
            ort,
            strasse: processedStrasse
        };

        // Werte in config und GM-Storage speichern
        Object.assign(config.addressData, addressData);
        await GM.setValue('customFieldValues', addressData);

        return addressData;
    }

    // GPS-Daten von OpenStreetMap abrufen
    async function getGPSData(plz, ort, strasse) {
        // URL zusammensetzen
        const osmUrl = strasse
            ? `${config.osmUrl}&postalcode=${plz}&city=${ort}&street=${strasse}`
            : `${config.osmUrl}&postalcode=${plz}&city=${ort}`;

        console.log("TOMMY - PLZ:", plz);
        console.log("TOMMY - Ort:", ort);
        console.log("TOMMY - Strasse:", strasse);

        // Mehrere Versuche, GPS-Daten zu bekommen
        for (let attempt = 0; attempt < config.maxGpsAttempts; attempt++) {
            try {
                const osmData = await fetchData(osmUrl);
                if (osmData && osmData.length > 0) {
                    const { lat, lon } = osmData[0];
                    return { lat, lon };
                } else {
                    console.error(`TOMMY - Attempt ${attempt + 1}: No GPS data found for the given address`);
                }
            } catch (error) {
                console.error(`TOMMY - Attempt ${attempt + 1}: Error fetching GPS data -`, error);
            }
        }

        console.error("TOMMY - Max attempts reached: No GPS data found for the given address");
        return null;
    }

    // Prüft Bedingungen für GPS-Daten
    async function checkCondition(issueKey) {
        const data = await fetchData(`${config.apiUrl}${issueKey}`);
        if (!data) return null;

        const { assignee, customfield_14413: plz, customfield_13702: ort, customfield_13700: strasse } = data.fields;
        if (!assignee || !plz || !ort) {
            console.error("TOMMY - Missing address fields or assignee");
            return null;
        }

        return await getGPSData(plz, ort, strasse);
    }

    /**
     * Button-Funktionen
     */
    // Button hinzufügen
    async function addButton() {
        const issueKey = extractIssueKey(window.location.href);
        if (!issueKey) return;

        // Adressdaten abrufen, wenn wir auf JIRA-Seite sind
        if (window.location.href.startsWith('https://nd-jira.unity.media.corp/browse/')) {
            const values = await getAddressData(issueKey);
            if (values) {
                await GM.setValue('customFieldValues', values);
            }
        }

        // GPS-Daten abrufen und Buttons hinzufügen
        const gpsData = await checkCondition(issueKey);
        if (!gpsData) return;

        const { lat, lon } = gpsData;
        const PBURL = generatePBURL(lat, lon);
        const geohackURL = generateGeoHackURL(lat, lon);
        const ul = document.querySelector(config.selectors.buttonContainer);
        if (!ul) {
            console.error("TOMMY - Could not find element", config.selectors.buttonContainer);
            return;
        }

        // Physical Browser Button erstellen
        const PBnewLi = document.createElement('li');
        const PBlink = document.createElement('a');
        PBlink.href = PBURL;
        PBlink.textContent = config.buttons.physicalBrowser.text;
        PBlink.target = config.buttons.physicalBrowser.target;
        PBlink.className = config.buttons.physicalBrowser.class;
        PBlink.addEventListener('click', function(event) {
            event.preventDefault();
            GM_openInTab(this.href, true);
            this.blur();
        });
        PBnewLi.appendChild(PBlink);

        // GeoHack Button erstellen
        const geoHackLi = document.createElement('li');
        const geoHackLink = document.createElement('a');
        geoHackLink.href = geohackURL;
        geoHackLink.textContent = config.buttons.geoHack.text;
        geoHackLink.target = config.buttons.geoHack.target;
        geoHackLink.className = config.buttons.geoHack.class;
        geoHackLink.addEventListener('click', function(event) {
            event.preventDefault();
            GM_openInTab(this.href, true);
            this.blur();
        });
        geoHackLi.appendChild(geoHackLink);

        // Erster Separator
        const separator1 = document.createElement('span');
        separator1.style.marginLeft = '10px';
        separator1.style.backgroundColor = config.separatorColors.separator1;
        separator1.style.width = '10px';
        separator1.style.height = '40px';
        separator1.style.display = 'inline-block';
        ul.insertBefore(separator1, PBnewLi.nextSibling);

        // Buttons zum Container hinzufügen
        ul.appendChild(PBnewLi);
        ul.appendChild(geoHackLi);

    }

    function removeButton() {
        // Entfernt Physical Browser Button
        const existingPBButton = document.querySelector(`.${config.buttons.physicalBrowser.class}`);
        if (existingPBButton) {
            existingPBButton.parentElement.remove();
        }

        // Entfernt GeoHack Button
        const existingGHButton = document.querySelector(`.${config.buttons.geoHack.class}`);
        if (existingGHButton) {
            existingGHButton.parentElement.remove();
        }

        // Entfernt ersten Separator
        const separator1 = document.querySelector('span[style="margin-left: 10px; background-color: white; width: 10px; height: 40px; display: inline-block;"]');
        if (separator1) {
            separator1.remove();
        }
    }

    /**
     * Physical Browser Funktionen
     */
    // Felder auf Physical Browser Seite befüllen
    async function populateFields(values) {
        for (const fieldName in config.fieldMappings) {
            const fieldSelector = `[data-name="${fieldName}"], [name="${fieldName}"]`;
            const field = document.querySelector(fieldSelector);
            if (field) {
                const value = values[config.fieldMappings[fieldName]];
                if (value !== undefined) {
                    field.value = value;
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    }

    // Prüfen, ob alle Felder vorhanden sind
    function areAllFieldsPresent() {
        return Object.keys(config.fieldMappings).every(fieldName => {
            const fieldSelector = `[data-name="${fieldName}"], [name="${fieldName}"]`;
            return document.querySelector(fieldSelector);
        });
    }

    // Wenn Felder bereit sind, diese befüllen
    function onFieldsReady(values) {
        if (areAllFieldsPresent()) {
            populateFields(values);
        }
    }

    // URL-Änderungen überwachen
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

    // Map Alert prüfen und ggf. neu laden
    const checkAndReload = () => {
        const targetElement = document.querySelector(config.selectors.mapAlert);
        if (targetElement &&
            targetElement.offsetParent !== null &&
            window.getComputedStyle(targetElement).visibility !== 'hidden' &&
            targetElement.textContent.includes("Nicht authentifizierter Zugriff auf Kartendaten.")
           ) {
            location.reload();
        }
    };

    /**
     * Initialisierung und Handler
     */
    // Allgemeine Initialisierung
    window.addEventListener('load', () => {
        removeButton();
        addButton();
        monitorUrlChanges();
    });

    // Physical Browser spezifische Initialisierung
    if (window.location.href.includes('https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html')) {
        // Initialer Check und regelmäßiger Intervall
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            checkAndReload();
        } else {
            window.addEventListener('DOMContentLoaded', checkAndReload);
        }
        setInterval(checkAndReload, config.checkInterval);

        // Layer-Visibility-Elemente verarbeiten
        waitForElement(config.selectors.layerVisibility).then((allLayerVisibilityElements) => {
            if (allLayerVisibilityElements.length >= 15) {
                allLayerVisibilityElements[1].click();
                allLayerVisibilityElements[14].click();
            } else {
                console.error('Not enough layer-visibility elements found.');
            }
        });

        // Formularfelder befüllen
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
})();
