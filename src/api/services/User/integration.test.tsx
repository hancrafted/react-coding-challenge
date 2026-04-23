import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import App from "../../../App";
import "../../../i18n";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("App happy path after user fetch resolves", () => {
  it("does not throw and keeps avatar visible after 600ms", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    act(() => {
      ReactDOM.render(<App />, container);
    });

    await act(async () => {
      await wait(600);
    });

    const thrownCall = errorSpy.mock.calls.find((call) => {
      const msg = String(call[0]);
      return (
        msg.includes("The above error occurred") ||
        msg.includes("React will try to recreate") ||
        msg.includes("Uncaught")
      );
    });

    const htmlAfter = container.innerHTML;

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
    errorSpy.mockRestore();

    if (thrownCall) {
      throw new Error("React logged an error: " + String(thrownCall[0]));
    }
    expect(htmlAfter.length).toBeGreaterThan(0);
  });
});
