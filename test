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

    // Centralized configuration
    const CONFIG = {
        JIRA_API_URL: 'https://nd-jira.unity.media.corp/rest/api/2/issue/',
        OSM_URL: 'https://nominatim.openstreetmap.org/search?format=json',
        BUTTON_TEXT: 'Physical Browser',
        BUTTON_CLASS: 'custom-physical-browser-button'
    };

    // Utility Functions
    const log = {
        info: (msg) => console.log(`[PB Script] ${msg}`),
        error: (msg) => console.error(`[PB Script] ${msg}`)
    };

    function extractIssueKey(url) {
        const match = url.match(/([A-Z]+-\d+)/);
        return match ? match[1] : null;
    }

    // Fetch issue details with robust error handling
    async function fetchIssueDetails(issueKey) {
        try {
            const response = await fetch(`${CONFIG.JIRA_API_URL}${issueKey}`);
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            log.error(`Issue fetch failed: ${error.message}`);
            return null;
        }
    }

    // Get GPS coordinates from OpenStreetMap
    async function getGpsCoordinates(plz, ort, strasse) {
        try {
            const url = `${CONFIG.OSM_URL}&postalcode=${plz}&city=${ort}&street=${strasse}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`OSM request failed: ${response.status}`);
            }
            
            const data = await response.json();
            return data.length > 0 
                ? { lat: data[0].lat, lon: data[0].lon }
                : null;
        } catch (error) {
            log.error(`GPS coordinate fetch failed: ${error.message}`);
            return null;
        }
    }

    // Create and inject Physical Browser button
    function createPhysicalBrowserButton(lat, lon) {
        const newButton = document.createElement('li');
        const link = document.createElement('a');
        
        link.href = `https://vfde-nig.ker-l-nigmsn01p.unity.media.corp:30443/physical_browser/index.html#/map/${lat},${lon},20z`;
        link.textContent = CONFIG.BUTTON_TEXT;
        link.target = '_blank';
        link.className = CONFIG.BUTTON_CLASS;
        
        link.addEventListener('click', (event) => {
            event.preventDefault();
            GM_openInTab(link.href, true);
        });
        
        newButton.appendChild(link);
        return newButton;
    }

    // Main button addition logic
    async function addPhysicalBrowserButton() {
        const currentURL = window.location.href;
        const issueKey = extractIssueKey(currentURL);
        
        if (!issueKey) {
            log.info('No issue key found');
            return;
        }

        const issueDetails = await fetchIssueDetails(issueKey);
        
        if (!issueDetails || !issueDetails.fields) {
            log.error('Could not retrieve issue details');
            return;
        }

        const { 
            customfield_14413: plz, 
            customfield_13702: ort, 
            customfield_13700: strasse 
        } = issueDetails.fields;

        if (!plz || !ort || !strasse) {
            log.error('Missing address details');
            return;
        }

        const gpsData = await getGpsCoordinates(plz, ort, strasse);
        
        if (!gpsData) {
            log.error('Could not get GPS coordinates');
            return;
        }

        const navigationMenu = document.querySelector('ul.aui-nav');
        if (!navigationMenu) {
            log.error('Navigation menu not found');
            return;
        }

        const physicalBrowserButton = createPhysicalBrowserButton(
            gpsData.lat, 
            gpsData.lon
        );

        const lastListItem = navigationMenu.lastElementChild;
        navigationMenu.insertBefore(
            physicalBrowserButton, 
            lastListItem.nextSibling
        );

        log.info('Physical Browser button added successfully');
    }

    // Physical Browser page specific logic
    function setupPhysicalBrowserPage() {
        const checkAndReload = () => {
            const mapAlert = document.querySelector('div#map-alert');
            if (mapAlert && 
                mapAlert.offsetParent !== null && 
                mapAlert.textContent.includes("Nicht authentifizierter Zugriff auf Kartendaten.")) {
                location.reload();
            }
        };

        document.addEventListener('DOMContentLoaded', checkAndReload);
        setInterval(checkAndReload, 1000);

        // Layer visibility setup
        const setupLayerVisibility = () => {
            const layerElements = document.querySelectorAll('span.layer-visibility');
            if (layerElements.length >= 15) {
                layerElements[1]?.click();
                layerElements[14]?.click();
            }
        };

        // Use MutationObserver for dynamic content
        const observer = new MutationObserver((mutations) => {
            if (document.querySelectorAll('span.layer-visibility').length >= 15) {
                setupLayerVisibility();
                observer.disconnect();
            }
        });

        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    }

    // Script initialization
    function initializeScript() {
        const currentURL = window.location.href;

        if (currentURL.includes('nd-jira.unity.media.corp/browse/')) {
            addPhysicalBrowserButton();
        }

        if (currentURL.includes('physical_browser/index.html')) {
            setupPhysicalBrowserPage();
        }
    }

    // Run script
    initializeScript();
})();
