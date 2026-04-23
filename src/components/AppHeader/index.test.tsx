import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { ThemeProvider } from "@mui/material/styles";
import { osapiens } from "../../themes";
import "../../i18n";
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
