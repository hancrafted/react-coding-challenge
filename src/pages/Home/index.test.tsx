import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import i18n from "../../i18n";
import Home from "./index";

describe("Home page list", () => {
  it("renders without React's missing-key warning", () => {
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const container = document.createElement("div");
    document.body.appendChild(container);

    act(() => {
      ReactDOM.render(<Home />, container);
    });

    const keyWarning = errorSpy.mock.calls.find((call) =>
      String(call[0]).includes(
        'Each child in a list should have a unique "key" prop'
      )
    );

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
    errorSpy.mockRestore();

    expect(keyWarning).toBeUndefined();
  });

  it("renders the word \"known\" in the intro as a <strong> element", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    act(() => {
      ReactDOM.render(<Home />, container);
    });

    const strong = Array.from(container.querySelectorAll("strong")).find(
      (el) => el.textContent === "known"
    );

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();

    expect(strong).toBeDefined();
  });

  // Issue #5: de.json must cover every key currently in use so that selecting
  // DE swaps the visible UI strings. We pin the three Home-page strings here;
  // AppHeader/AvatarMenu strings are covered by their own specs.
  it("renders the Home strings in German when i18n language is 'de'", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    act(() => {
      i18n.changeLanguage("de");
    });
    act(() => {
      ReactDOM.render(<Home />, container);
    });

    const text = container.textContent || "";
    expect(text).toContain("Willkommen!");
    // The DE intro must still render the bold equivalent via <Trans>.
    const strong = Array.from(container.querySelectorAll("strong")).find(
      (el) => el.textContent === "bekannten"
    );
    expect(strong).toBeDefined();

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
    act(() => {
      i18n.changeLanguage("en");
    });
  });

  it("falls back to English when a DE key is missing", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    // Simulate a missing key by rebuilding the runtime DE bundle without it.
    // addResourceBundle merges even with deep+overwrite, so we remove first.
    const originalBundle = i18n.getResourceBundle("de", "app");
    const stripped = { ...originalBundle };
    delete (stripped as Record<string, unknown>).home;
    i18n.removeResourceBundle("de", "app");
    i18n.addResourceBundle("de", "app", stripped, true, true);

    act(() => {
      i18n.changeLanguage("de");
    });
    act(() => {
      ReactDOM.render(<Home />, container);
    });

    const text = container.textContent || "";
    // Falls back to English copy — not the raw key string.
    expect(text).toContain("Welcome!");
    expect(text).not.toContain("home.welcome");

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
    // Restore the original DE bundle and reset language for other tests.
    i18n.removeResourceBundle("de", "app");
    i18n.addResourceBundle("de", "app", originalBundle, true, true);
    act(() => {
      i18n.changeLanguage("en");
    });
  });
});
