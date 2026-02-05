import { describe, it, expect } from "bun:test";

describe("DOM Helpers", () => {
  let JSDOM: any;
  let document: any;
  let HTMLElement: any;

  beforeAll(async () => {
    try {
      JSDOM = (await import("jsdom")).JSDOM;
    } catch {
      console.log("jsdom not available, skipping DOM helper tests");
    }
  });

  beforeEach(() => {
    if (JSDOM) {
      // Mock DOM environment
      const dom = new JSDOM(`
        <div id="parent">
          <div class="child">Child 1</div>
          <div class="child">Child 2</div>
          <button>Button 1</button>
          <button>Button 2</button>
          <span>Span 1</span>
          <input type="text" />
        </div>
      `);
      global.document = dom.window.document;
      global.HTMLElement = dom.window.HTMLElement;
    }
  });

  if (!JSDOM) {
    it("jsdom not installed - tests skipped", () => {
      console.log("Install jsdom: bun add -D jsdom");
    });
  } else {
    describe("parent.getElementsByTagName", () => {
      const parent = document.getElementById("parent") as HTMLElement;

      it("should get all elements by tag name", async () => {
        const {
          getElementsByTagName,
          getFirstElementByTagName,
          countElementsByTagName,
          getInputs,
          getButtons
        } = await import("../src/utils/dom-helpers");
        
        const divs = getElementsByTagName(parent, "div");
        expect(divs.length).toBe(2);

        const buttons = getElementsByTagName(parent, "button");
        expect(buttons.length).toBe(2);

        const spans = getElementsByTagName(parent, "span");
        expect(spans.length).toBe(1);
      });

      it("should get first element by tag name", () => {
        const firstDiv = getFirstElementByTagName(parent, "div");
        expect(firstDiv).toBeTruthy();
        expect(firstDiv?.textContent).toBe("Child 1");

        const firstButton = getFirstElementByTagName(parent, "button");
        expect(firstButton).toBeTruthy();
        expect(firstButton?.textContent).toBe("Button 1");
      });

      it("should count elements by tag name", () => {
        const divCount = countElementsByTagName(parent, "div");
        expect(divCount).toBe(2);

        const buttonCount = countElementsByTagName(parent, "button");
        expect(buttonCount).toBe(2);
      });

      it("should get all inputs", () => {
        const inputs = getInputs(parent);
        expect(inputs.length).toBe(1);
        expect(inputs[0].type).toBe("text");
      });

      it("should get all buttons", () => {
        const buttons = getButtons(parent);
        expect(buttons.length).toBe(2);
      });

      it("should return empty array for non-existent tag", () => {
        const nonExistent = getElementsByTagName(parent, "non-existent");
        expect(nonExistent.length).toBe(0);
      });

      it("should handle nested elements", () => {
        const nestedDiv = document.createElement("div");
        nestedDiv.innerHTML = `
          <span>Nested Span</span>
          <button>Nested Button</button>
        `;
        parent.appendChild(nestedDiv);

        const spans = getElementsByTagName(parent, "span");
        expect(spans.length).toBe(2);

        const buttons = getElementsByTagName(parent, "button");
        expect(buttons.length).toBe(3);

        parent.removeChild(nestedDiv);
      });

      it("should handle case sensitivity", () => {
        const divs = getElementsByTagName(parent, "DIV");
        expect(divs.length).toBe(0);
      });

      it("should support array conversion", () => {
        const divs = getElementsByTagName(parent, "div");
        const divArray = Array.from(divs);

        expect(Array.isArray(divArray)).toBe(true);
        expect(divArray.length).toBe(2);
        expect(divArray[0].textContent).toBe("Child 1");
        expect(divArray[1].textContent).toBe("Child 2");
      });
    });
  }
});
