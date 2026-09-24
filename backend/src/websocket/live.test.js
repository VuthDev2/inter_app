import { describe, it, expect, vi } from "vitest";
import { handleLiveConnection } from "./live.js";

vi.mock("ws");

describe("handleLiveConnection", () => {
  it("should setup listeners on client socket", () => {
    const mockClientSocket = {
      readyState: 1, // OPEN
      on: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
    };

    handleLiveConnection(mockClientSocket);

    // Check if it registered the message, close, and error listeners
    expect(mockClientSocket.on).toHaveBeenCalledWith("message", expect.any(Function));
    expect(mockClientSocket.on).toHaveBeenCalledWith("close", expect.any(Function));
    expect(mockClientSocket.on).toHaveBeenCalledWith("error", expect.any(Function));
  });
});
