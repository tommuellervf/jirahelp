// ==UserScript==
// @name          Jira - Physical Browser Integration
// @version       1.0.3
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

    // Zentrale Konfiguration
    const config = {
        apiUrl: 'https://nd-jira.unity.media.corp/rest/api/2/issue/',
        osmUrl: 'https://nominatim.openstreetmap.org/search?format=json',
        buttons: {
            physicalBrowser: {
                text: 'Physical Browser',
                target: '_blank',
                class: 'custom-button-class animated-button'
            },
            geoHack: {
                text: 'GeoHack',
                target: '_blank',
                class: 'custom-button-class animated-button'
            }
        },
        errorMessage: {
            text: 'Adresse fehlerhaft?',
            class: 'error-message animated-button'
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
        maxGpsAttempts: 3,
        checkInterval: 1000,
        separatorColors: {
            separator1: 'white'
        },
        animation: {
            numParticles: 20,
            particleColors: ['#FF5252', '#FFEB3B', '#2196F3', '#4CAF50', '#9C27B0'],
            animationDuration: 800,
            particleDuration: 1500
        }
    };

    // Fetch
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

    // Fehlermeldung anzeigen
    function showErrorMessage() {
        const ul = document.querySelector(config.selectors.buttonContainer);
        if (!ul) return;

        // Entferne bestehende Elemente
        removeButton();

        // Erster Separator
        const separator1 = document.createElement('span');
        separator1.style.marginLeft = '10px';
        separator1.style.backgroundColor = config.separatorColors.separator1;
        separator1.style.width = '10px';
        separator1.style.height = '40px';
        separator1.style.display = 'inline-block';
        separator1.className = 'separator-animated';
        ul.appendChild(separator1);

        // Fehlermeldung erstellen
        const errorLi = document.createElement('li');
        const errorSpan = document.createElement('span');
        errorSpan.textContent = config.errorMessage.text;
        errorSpan.className = config.errorMessage.class;
        errorLi.appendChild(errorSpan);
        ul.appendChild(errorLi);

        // Animationseffekt für Fehlermeldung
        setTimeout(() => {
            createParticleEffect(errorSpan);
        }, 100);
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

        // Hier wird die Fehlermeldung angezeigt, wenn keine GPS-Daten gefunden wurden
        showErrorMessage();

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

    // Stylesheet für Animationen
    function injectStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @keyframes popIn {
                0% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.2); opacity: 0.8; }
                80% { transform: scale(0.9); opacity: 0.9; }
                100% { transform: scale(1); opacity: 1; }
            }

            .animated-button {
                position: relative;
                animation: popIn ${config.animation.animationDuration}ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                transform-origin: center;
            }

            .particle {
                position: absolute;
                border-radius: 50%;
                pointer-events: none;
                z-index: 100;
                box-shadow: 0 0 5px 2px rgba(255, 255, 255, 0.7);
            }

            @keyframes particleAnimation {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(0); opacity: 0; }
            }

            .separator-animated {
                animation: fadeIn 500ms ease-in-out forwards;
            }

            @keyframes fadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }

            @keyframes glow {
                0% { box-shadow: 0 0 5px 0px rgba(255, 255, 255, 0.5); }
                50% { box-shadow: 0 0 15px 5px rgba(255, 255, 255, 0.8); }
                100% { box-shadow: 0 0 5px 0px rgba(255, 255, 255, 0.5); }
            }

            .error-message {
                color: #FF5252;
                font-weight: bold;
                padding: 5px 10px;
                border-radius: 3px;
                background-color: rgba(255, 82, 82, 0.1);
                border: 1px solid #FF5252;
                margin-left: 10px;
            }
        `;
        document.head.appendChild(styleElement);
    }

    // Partikel-Effekt für ein Element erstellen
    function createParticleEffect(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < config.animation.numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Zufällige Größe, Farbe und Geschwindigkeit
            const size = Math.random() * 8 + 4;
            const colorIndex = Math.floor(Math.random() * config.animation.particleColors.length);
            const color = config.animation.particleColors[colorIndex];

            // Zufällige Richtung in alle Richtungen
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            const speed = Math.random() * 1 + 0.5;

            // Stil setzen
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.backgroundColor = color;
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;

            document.body.appendChild(particle);

            // Animation starten
            const start = performance.now();
            const duration = config.animation.particleDuration * speed;

            function animateParticle(timestamp) {
                const elapsed = timestamp - start;
                const progress = Math.min(elapsed / duration, 1);

                const currentDistance = distance * progress;
                const x = centerX + Math.cos(angle) * currentDistance;
                const y = centerY + Math.sin(angle) * currentDistance;

                particle.style.left = `${x}px`;
                particle.style.top = `${y}px`;
                particle.style.opacity = 1 - progress;
                particle.style.transform = `scale(${1 - progress * 0.5})`;

                if (progress < 1) {
                    requestAnimationFrame(animateParticle);
                } else {
                    document.body.removeChild(particle);
                }
            }

            requestAnimationFrame(animateParticle);
        }
    }

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

        // Erster Separator
        const separator1 = document.createElement('span');
        separator1.style.marginLeft = '10px';
        separator1.style.backgroundColor = config.separatorColors.separator1;
        separator1.style.width = '10px';
        separator1.style.height = '40px';
        separator1.style.display = 'inline-block';
        separator1.className = 'separator-animated';
        ul.appendChild(separator1);

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
        ul.appendChild(PBnewLi);

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
        ul.appendChild(geoHackLi);

        // Animationseffekte hinzufügen
        setTimeout(() => {
            createParticleEffect(PBlink);
            setTimeout(() => {
                createParticleEffect(geoHackLink);
            }, 200);
        }, 100);
    }

    function removeButton() {
        // Entfernt Physical Browser Button
        const existingPBButton = document.querySelector(`.${config.buttons.physicalBrowser.class.split(' ')[0]}`);
        if (existingPBButton) {
            existingPBButton.parentElement.remove();
        }

        // Entfernt GeoHack Button
        const existingGHButton = document.querySelector(`.${config.buttons.geoHack.class.split(' ')[0]}`);
        if (existingGHButton) {
            existingGHButton.parentElement.remove();
        }

        // Entfernt Fehlermeldung
        const errorMessage = document.querySelector(`.${config.errorMessage.class.split(' ')[0]}`);
        if (errorMessage) {
            errorMessage.parentElement.remove();
        }

        // Entfernt Separator
        const separator1 = document.querySelector('.separator-animated');
        if (separator1) {
            separator1.remove();
        }

        // Entfernt alle verbleibenden Partikel
        document.querySelectorAll('.particle').forEach(particle => {
            particle.remove();
        });
    }

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

    // Allgemeine Initialisierung
    window.addEventListener('load', () => {
        injectStyles();
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
                console.error('TOMMY - Not enough layer-visibility elements found.');
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
