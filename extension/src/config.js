const QUICKVOICE_CONFIG = {
  apiBaseUrl: "http://localhost:8000",
  webUrl: "http://localhost:3000",
  appUrl: "http://localhost:8083",
  supabaseUrl: "https://thdcfkgdhjrlesgfgfic.supabase.co",
  supabaseAnonKey: "sb_publishable_T8qx-cCPoy7Ovg_wUsHkiw_P2NSsUh2"
};

if (typeof globalThis !== "undefined") {
  globalThis.QUICKVOICE_CONFIG = QUICKVOICE_CONFIG;
}
