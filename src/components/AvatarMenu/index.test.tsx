import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { Grow } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import AvatarMenu from "./index";
import { osapiens } from "../../themes";
import "../../i18n";

// AvatarMenu is mounted inside <Grow> in AppHeader. Grow injects a ref into
// its child via cloneElement and reads node.scrollTop during its enter
// transition. If AvatarMenu does not forwardRef, nodeRef.current is null and
// reflow(null) throws, which in React 17 unmounts the whole tree.
describe("AvatarMenu inside <Grow>", () => {
  it("does not crash the tree on mount", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const user = {
      firstName: "Aria",
      lastName: "Test",
      eMail: "linda.bolt@osapiens.com"
    };

    act(() => {
      ReactDOM.render(
        <ThemeProvider theme={osapiens.light}>
          <Grow in>
            <AvatarMenu user={user} />
          </Grow>
        </ThemeProvider>,
        container
      );
    });

    const fatal = errorSpy.mock.calls.find((call) => {
      const msg = String(call[0]);
      return (
        msg.includes("scrollTop") ||
        msg.includes("The above error occurred")
      );
    });

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
    errorSpy.mockRestore();

    expect(fatal).toBeUndefined();
  });
});
