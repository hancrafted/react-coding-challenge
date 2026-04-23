import React, { useState } from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { StoreProvider, useUserStore } from "./index";
import type UserStore from "./store";

describe("StoreProvider", () => {
  it("provides the same UserStore instance across ancestor re-renders", () => {
    const seen: (UserStore | null)[] = [];
    let triggerRerender: () => void = () => undefined;

    const Consumer: React.FC = () => {
      const store = useUserStore();
      seen.push(store);
      return null;
    };

    const Ancestor: React.FC = () => {
      const [, setTick] = useState(0);
      triggerRerender = () => setTick((t) => t + 1);
      return (
        <StoreProvider>
          <Consumer />
        </StoreProvider>
      );
    };

    const container = document.createElement("div");
    document.body.appendChild(container);

    act(() => {
      ReactDOM.render(<Ancestor />, container);
    });

    act(() => {
      triggerRerender();
    });

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[0]).not.toBeNull();
    expect(seen[1]).toBe(seen[0]);
  });
});
