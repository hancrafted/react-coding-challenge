import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import "../../i18n";
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
});
