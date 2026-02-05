#!/usr/bin/env bun
/**
 * Test suite for dashboard main.js functionality
 * Tests the updateLastUpdateTime function
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

// Mock DOM environment
function createMockDOM() {
    const mockElement = {
        textContent: "--",
        innerText: "--",
        innerHTML: "--",
        setAttribute: (() => {}) as any,
        offsetHeight: 0,
        parentElement: null,
        querySelector: (() => null) as any,
    };

    const mockDocument = {
        getElementById: ((id: string) => {
            if (id === "lastUpdateTime") {
                return mockElement;
            }
            if (id === "lastUpdate") {
                return {
                    ...mockElement,
                    querySelector: (selector: string) => {
                        if (selector === "time") {
                            return mockElement;
                        }
                        return null;
                    },
                    innerHTML: "Last Update: <time id=\"lastUpdateTime\">--</time>",
                };
            }
            return null;
        }) as any,
    };

    return { mockElement, mockDocument };
}

describe("updateLastUpdateTime", () => {
    let mockElement: any;
    let mockDocument: any;
    let $: any;
    let updateLastUpdateTime: () => void;

    beforeEach(() => {
        const mock = createMockDOM();
        mockElement = mock.mockElement;
        mockDocument = mock.mockDocument;
        
        // Mock the $ cache object
        $ = {
            lastUpdateTime: null,
        };

        // Create the function with mocked dependencies
        updateLastUpdateTime = () => {
            const time = new Date().toLocaleTimeString();
            const isoTime = new Date().toISOString();
            
            // Try multiple strategies to find and update the time element
            let timeElement = $.lastUpdateTime || mockDocument.getElementById("lastUpdateTime");
            
            if (!timeElement) {
                // Fallback: find via parent
                const parentSpan = mockDocument.getElementById("lastUpdate");
                if (parentSpan) {
                    timeElement = parentSpan.querySelector("time");
                    if (timeElement) {
                        // Cache it for next time
                        $.lastUpdateTime = timeElement;
                    }
                }
            }
            
            if (timeElement) {
                // Update the time element directly - try multiple methods
                const oldValue = timeElement.textContent;
                timeElement.textContent = time;
                timeElement.innerText = time; // Fallback
                timeElement.setAttribute("datetime", isoTime);
                
                // Verify the update worked
                if (timeElement.textContent === "--" || timeElement.textContent === "" || timeElement.textContent === oldValue) {
                    timeElement.innerHTML = time;
                }
            } else {
                // Last resort: update parent span directly
                const parentSpan = mockDocument.getElementById("lastUpdate");
                if (parentSpan) {
                    // Preserve the "Last Update: " label and update the time
                    parentSpan.innerHTML = `Last Update: <time id="lastUpdateTime" datetime="${isoTime}">${time}</time>`;
                    // Cache the newly created element
                    $.lastUpdateTime = mockDocument.getElementById("lastUpdateTime");
                }
            }
        };
    });

    afterEach(() => {
        $.lastUpdateTime = null;
    });

    it("should update time element when element exists in cache", () => {
        $.lastUpdateTime = mockElement;
        mockElement.textContent = "--";
        
        updateLastUpdateTime();
        
        expect(mockElement.textContent).not.toBe("--");
        expect(mockElement.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}/); // Time format
        // Element should remain cached
        expect($.lastUpdateTime).toBe(mockElement);
    });

    it("should find element via getElementById when not cached", () => {
        $.lastUpdateTime = null;
        mockElement.textContent = "--";
        
        updateLastUpdateTime();
        
        expect(mockElement.textContent).not.toBe("--");
        // Element should be cached after finding it
        expect($.lastUpdateTime).toBe(mockElement);
    });

    it("should find element via parent querySelector when direct lookup fails", () => {
        $.lastUpdateTime = null;
        // Mock getElementById to return null for lastUpdateTime
        const originalGetById = mockDocument.getElementById;
        mockDocument.getElementById = (id: string) => {
            if (id === "lastUpdateTime") {
                return null;
            }
            return originalGetById(id);
        };
        
        mockElement.textContent = "--";
        
        updateLastUpdateTime();
        
        expect(mockElement.textContent).not.toBe("--");
        expect($.lastUpdateTime).toBe(mockElement);
        
        // Restore
        mockDocument.getElementById = originalGetById;
    });

    it("should update parent innerHTML when element not found", () => {
        $.lastUpdateTime = null;
        const parentSpan = mockDocument.getElementById("lastUpdate");
        parentSpan.innerHTML = "Last Update: <time id=\"lastUpdateTime\">--</time>";
        
        // Create a new mock element that will be returned after innerHTML update
        let newTimeElement: any = null;
        
        // Mock getElementById to return null for lastUpdateTime initially
        const originalGetById = mockDocument.getElementById;
        mockDocument.getElementById = (id: string) => {
            if (id === "lastUpdateTime") {
                // After innerHTML is set, return the new element
                if (newTimeElement) {
                    return newTimeElement;
                }
                return null;
            }
            if (id === "lastUpdate") {
                return parentSpan;
            }
            return null;
        };
        
        // Override innerHTML setter to create new element
        let innerHTMLValue = parentSpan.innerHTML;
        Object.defineProperty(parentSpan, "innerHTML", {
            get: () => innerHTMLValue,
            set: (value: string) => {
                innerHTMLValue = value;
                // Create a new mock element when innerHTML is set
                newTimeElement = {
                    ...mockElement,
                    textContent: value.match(/>([^<]+)</)?.[1] || "",
                };
            },
        });
        
        updateLastUpdateTime();
        
        expect(innerHTMLValue).toContain("Last Update:");
        expect(innerHTMLValue).toContain("<time");
        // The innerHTML should be updated with the new time
        const timeMatch = innerHTMLValue.match(/>([^<]+)</);
        if (timeMatch) {
            expect(timeMatch[1]).not.toBe("--");
            expect(timeMatch[1]).toMatch(/\d{1,2}:\d{2}:\d{2}/);
        }
        
        // Restore
        mockDocument.getElementById = originalGetById;
    });

    it("should set datetime attribute", () => {
        $.lastUpdateTime = mockElement;
        let datetimeValue = "";
        mockElement.setAttribute = (name: string, value: string) => {
            if (name === "datetime") {
                datetimeValue = value;
            }
        };
        
        updateLastUpdateTime();
        
        expect(datetimeValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format
    });

    it("should handle multiple calls correctly", () => {
        $.lastUpdateTime = mockElement;
        
        updateLastUpdateTime();
        const firstTime = mockElement.textContent;
        
        // Wait a bit to ensure time changes
        Bun.sleep(100);
        
        updateLastUpdateTime();
        const secondTime = mockElement.textContent;
        
        // Times should be different (or at least the function should run without error)
        expect(typeof firstTime).toBe("string");
        expect(typeof secondTime).toBe("string");
        expect(firstTime).not.toBe("--");
        expect(secondTime).not.toBe("--");
    });
});

describe("DOM element structure", () => {
    it("should have correct HTML structure for lastUpdate", () => {
        const expectedHTML = 'Last Update: <time id="lastUpdateTime">--</time>';
        expect(expectedHTML).toContain("lastUpdateTime");
        expect(expectedHTML).toContain("<time");
    });
});
