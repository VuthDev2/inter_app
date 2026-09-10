import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from "../config.js";

class UserRepository {
  constructor() {
    this.adminClient =
      SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes("your_")
        ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        : null;

    this.publicClient =
      SUPABASE_URL && SUPABASE_ANON_KEY
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        : null;
  }

  get isConfigured() {
    return Boolean(this.adminClient || this.publicClient);
  }

  async createUser(email, password, displayName) {
    if (this.adminClient) {
      const { data, error } = await this.adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });
      if (error) throw error;
      return data.user;
    }

    if (this.publicClient) {
      const { data, error } = await this.publicClient.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) throw error;
      return data.user;
    }

    throw new Error("Server configuration incomplete.");
  }

  async findUserByEmail(email) {
    if (!this.adminClient) return null;
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data: { users }, error } = await this.adminClient.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const user = users.find(u => u.email === email);
      if (user) return user;
      if (users.length < 1000) hasMore = false;
      page++;
    }
    return null;
  }

  async updateUserPassword(userId, newPassword) {
    if (!this.adminClient) throw new Error("Admin client required for password reset without old password.");
    const { error } = await this.adminClient.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw error;
  }
}

export const userRepository = new UserRepository();
