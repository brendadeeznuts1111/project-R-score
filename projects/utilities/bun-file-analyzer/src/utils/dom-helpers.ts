/**
 * DOM Helper functions using parent.getElementsByTagName
 */

/**
 * Get all elements of a specific tag name within a parent element
 * @param parent - The parent element to search within
 * @param tagName - The tag name to search for (e.g., 'div', 'span', 'button')
 * @returns HTMLCollection of matching elements
 */
export function getElementsByTagName(parent: HTMLElement, tagName: string): HTMLCollectionOf<Element> {
  return parent.getElementsByTagName(tagName);
}

/**
 * Get the first element of a specific tag name within a parent
 * @param parent - The parent element to search within  
 * @param tagName - The tag name to search for
 * @returns First matching element or null
 */
export function getFirstElementByTagName(parent: HTMLElement, tagName: string): Element | null {
  return parent.getElementsByTagName(tagName)[0] || null;
}

/**
 * Count elements of a specific tag name within a parent
 * @param parent - The parent element to search within
 * @param tagName - The tag name to count
 * @returns Number of matching elements
 */
export function countElementsByTagName(parent: HTMLElement, tagName: string): number {
  return parent.getElementsByTagName(tagName).length;
}

/**
 * Get all input elements within a form or container
 * @param parent - The parent element (usually a form)
 * @returns Array of input elements
 */
export function getInputs(parent: HTMLElement): HTMLInputElement[] {
  return Array.from(parent.getElementsByTagName('input')) as HTMLInputElement[];
}

/**
 * Get all buttons within a container
 * @param parent - The parent element
 * @returns Array of button elements
 */
export function getButtons(parent: HTMLElement): HTMLButtonElement[] {
  return Array.from(parent.getElementsByTagName('button')) as HTMLButtonElement[];
}

/**
 * Example React hook using getElementsByTagName
 */
export function useDOMAnalysis(parentRef: React.RefObject<HTMLElement>) {
  const analyzeDOM = () => {
    if (!parentRef.current) return null;
    
    const parent = parentRef.current;
    
    return {
      totalDivs: countElementsByTagName(parent, 'div'),
      totalButtons: countElementsByTagName(parent, 'button'),
      totalInputs: countElementsByTagName(parent, 'input'),
      allButtons: getButtons(parent),
      allInputs: getInputs(parent),
      firstButton: getFirstElementByTagName(parent, 'button') as HTMLButtonElement,
    };
  };

  return { analyzeDOM };
}
