import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { ThemeProvider } from "@mui/material/styles";
import { osapiens } from "../../themes";
import i18n, { LANGUAGE_STORAGE_KEY } from "../../i18n";
import AppHeader from "./index";

// AppHeader's countdown must be driven by a wall-clock deadline, not by a
// tick-counting state. Pinning three invariants from issue #4:
//   1. Initial display is 60:00.
//   2. Elapsed time tracks Date.now() drift, not the number of interval
//      callbacks that ran (backgrounded-tab / HMR-throttled case).
//   3. The effect cleans up its interval on unmount (no leaked timers).

const user = {
  firstName: "Aria",
  lastName: "Test",
  eMail: "linda.bolt@osapiens.com"
};

const renderHeader = (container: HTMLElement) => {
  act(() => {
    ReactDOM.render(
      <ThemeProvider theme={osapiens.light}>
        <AppHeader user={user} pageTitle="Home" />
      </ThemeProvider>,
      container
    );
  });
};

const readCountdown = (container: HTMLElement) => {
  const match = (container.textContent || "").match(/\d{2}:\d{2}/);
  return match ? match[0] : "";
};

describe("AppHeader countdown", () => {
  let container: HTMLElement;
  let now: number;
  let dateSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    now = 1_700_000_000_000;
    dateSpy = jest.spyOn(Date, "now").mockImplementation(() => now);
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
    dateSpy.mockRestore();
    jest.useRealTimers();
  });

  it("starts at 60:00", () => {
    renderHeader(container);
    expect(readCountdown(container)).toBe("60:00");
  });

  it("reflects real elapsed time, not the number of interval callbacks", () => {
    renderHeader(container);

    // Simulate a backgrounded tab: 30 s of wall-clock time passes, but the
    // browser throttles us and only one interval callback fires.
    now += 30_000;
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(readCountdown(container)).toBe("59:30");
  });

  it("ticks once per second under normal conditions", () => {
    renderHeader(container);
    now += 1000;
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(readCountdown(container)).toBe("59:59");
  });

  it("clears its own interval on unmount (no leaked countdown timer)", () => {
    renderHeader(container);
    const mountedTimers = jest.getTimerCount();
    expect(mountedTimers).toBeGreaterThan(0);

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });

    // The interval scheduled by AppHeader must be gone. Other transient
    // timers owned by MUI transitions are not this effect's responsibility;
    // we only pin that our own interval is cleared.
    expect(jest.getTimerCount()).toBeLessThan(mountedTimers);

    // Advancing time after unmount must not produce any further state
    // updates from the (now cleared) interval.
    const warnSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    const leak = warnSpy.mock.calls.find((call) =>
      String(call[0]).includes("unmounted component")
    );
    warnSpy.mockRestore();
    expect(leak).toBeUndefined();
  });
});

// Issue #5: EN/DE language switcher to the left of the avatar. Pins the
// behaviour contract: DOM placement, menu contents, persistence, and that the
// switcher reflects the i18n instance's current language on mount.
describe("AppHeader language switcher", () => {
  let container: HTMLElement;

  const mount = () => {
    act(() => {
      ReactDOM.render(
        <ThemeProvider theme={osapiens.light}>
          <AppHeader user={user} pageTitle="Home" />
        </ThemeProvider>,
        container
      );
    });
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.localStorage.clear();
    act(() => {
      i18n.changeLanguage("en");
    });
  });

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
    // Close any open MUI Menu portals between tests.
    document
      .querySelectorAll(".MuiPopover-root, .MuiModal-root")
      .forEach((n) => n.parentElement?.removeChild(n));
    window.localStorage.clear();
    act(() => {
      i18n.changeLanguage("en");
    });
  });

  it("renders a language switcher before the avatar with the current locale label", () => {
    mount();
    const switcher = container.querySelector(
      "[aria-label='change language']"
    ) as HTMLElement | null;
    const avatar = container.querySelector(".MuiAvatar-root");

    expect(switcher).not.toBeNull();
    expect(avatar).not.toBeNull();
    expect(switcher!.textContent).toBe("EN");
    // Switcher must sit *before* the avatar in document order.
    const rel = switcher!.compareDocumentPosition(avatar!);
    expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // MUI's Select display element opens on mousedown (not click), so tests
  // dispatch a bubbling MouseEvent that React's delegated listener can catch.
  const openSelect = (el: HTMLElement) => {
    act(() => {
      el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
  };

  it("opens a menu exposing EN and DE options (two-letter labels, no flags)", () => {
    mount();
    const switcher = container.querySelector(
      "[aria-label='change language']"
    ) as HTMLElement;

    openSelect(switcher);

    const labels = Array.from(
      document.querySelectorAll(".MuiMenuItem-root")
    ).map((el) => (el.textContent || "").trim());
    expect(labels).toEqual(expect.arrayContaining(["EN", "DE"]));
  });

  it("persists selection to localStorage and switches i18n language when DE is chosen", () => {
    mount();
    const switcher = container.querySelector(
      "[aria-label='change language']"
    ) as HTMLElement;
    openSelect(switcher);

    const deItem = Array.from(
      document.querySelectorAll(".MuiMenuItem-root")
    ).find((el) => (el.textContent || "").trim() === "DE") as HTMLElement;

    act(() => {
      deItem.click();
    });

    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("de");
    expect(i18n.language).toBe("de");
  });

  it("reflects the currently active language in its label (DE after switching)", () => {
    act(() => {
      i18n.changeLanguage("de");
    });
    mount();
    const switcher = container.querySelector(
      "[aria-label='change language']"
    ) as HTMLElement;
    expect(switcher.textContent).toBe("DE");
  });
});
