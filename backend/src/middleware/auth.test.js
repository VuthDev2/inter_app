import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "./auth.js";

const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }));

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: () => ({
      auth: {
        getUser: mockGetUser,
      },
    }),
  };
});

describe("requireAuth Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
    mockGetUser.mockReset();
  });

  it("should return 401 if authorization header is missing", async () => {
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: "Missing or invalid authorization header.",
    });
  });

  it("should return 401 if token is invalid or expired", async () => {
    req.headers.authorization = "Bearer bad_token";
    mockGetUser.mockResolvedValue({ error: { message: "Invalid token" }, data: null });

    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should call next() if token is valid", async () => {
    req.headers.authorization = "Bearer good_token";
    mockGetUser.mockResolvedValue({ error: null, data: { user: { id: 1 } } });

    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 1 });
  });
});
