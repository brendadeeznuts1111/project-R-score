export function mustElement<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element as T;
}

export function setText(selector: string, value: string): void {
  mustElement(selector).textContent = value;
}

export function setMarkup(selector: string, markup: string): void {
  mustElement(selector).innerHTML = markup;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formField(
  form: HTMLFormElement,
  name: string,
): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const field = form.querySelector(`[name="${name}"]`);
  if (!field) {
    throw new Error(`Missing field ${name}`);
  }
  return field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
}

export function formValue(form: HTMLFormElement, name: string): string {
  return formField(form, name).value.trim();
}
