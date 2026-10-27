import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
Element.prototype.scrollIntoView = vi.fn();
HTMLDialogElement.prototype.showModal = vi.fn();
