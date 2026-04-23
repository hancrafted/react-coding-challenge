import UserStore from "./store";
import { ActionResultStatus } from "../../../types/global";

describe("UserStore", () => {
  it("getOwnUser populates the observable `user` property on success", async () => {
    const store = new UserStore();
    expect(store.user).toBeNull();

    const result = await store.getOwnUser();

    expect(result.status).toBe(ActionResultStatus.SUCCESS);
    expect(store.user).not.toBeNull();
    expect(store.user?.firstName).toBe("Aria");
    expect(store.user?.lastName).toBe("Test");
  });
});
