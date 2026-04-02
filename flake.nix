{
  description = "Live Menu CF — Cloudflare-native restaurant digital menu system";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        browsers =
          (builtins.fromJSON (builtins.readFile "${pkgs.playwright-driver}/browsers.json")).browsers;
        chromium-rev = (builtins.head (builtins.filter (x: x.name == "chromium") browsers)).revision;
        # Wrapper scripts that work with both `nix develop` and direnv
        dev-backend = pkgs.writeShellScriptBin "dev-backend" ''
          cd "''${LIVE_MENU_ROOT:-$PWD}/backend" && ${pkgs.bun}/bin/bun run dev
        '';
        dev-menu = pkgs.writeShellScriptBin "dev-menu" ''
          cd "''${LIVE_MENU_ROOT:-$PWD}/frontend-menu" && ${pkgs.bun}/bin/bun run dev
        '';
        dev-admin = pkgs.writeShellScriptBin "dev-admin" ''
          cd "''${LIVE_MENU_ROOT:-$PWD}/frontend-admin" && ${pkgs.bun}/bin/bun run dev
        '';
        e2e = pkgs.writeShellScriptBin "e2e" ''
          cd "''${LIVE_MENU_ROOT:-$PWD}/e2e" && ${pkgs.bun}/bin/bunx playwright test "$@"
        '';
        db = pkgs.writeShellScriptBin "db" ''
          export PATH="''${LIVE_MENU_ROOT:-$PWD}/node_modules/.bin:$PATH"
          wrangler d1 "$@"
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          name = "live-menu-cf";

          buildInputs = [
            # Core runtime
            pkgs.bun              # JavaScript runtime and package manager
            pkgs.nodejs           # Node.js (required by some tools)

            # Playwright browsers (for e2e tests)
            pkgs.playwright-driver.browsers

            # Project commands (work with direnv, unlike aliases)
            dev-backend
            dev-menu
            dev-admin
            e2e
            db

            # Development tools
            pkgs.git              # Version control
            pkgs.openssl          # Crypto utilities
            pkgs.curl             # API testing
            pkgs.jq               # JSON processing

            # Database inspection
            pkgs.sqlite           # D1 local database inspection
          ];

          shellHook = ''
            # Anchor project root for wrapper scripts (works from any subdirectory)
            export LIVE_MENU_ROOT="$PWD"

            # Use project-local wrangler (keeps version in sync with package.json)
            export PATH="$PWD/node_modules/.bin:$PATH"

            # Playwright: point to the Nix-managed Chromium binary
            export PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH="${pkgs.playwright-driver.browsers}/chromium-${chromium-rev}/chrome-linux64/chrome"
          '';

          # Prevent npm from being used accidentally
          NODE_ENV = "development";
        };

        # Apps for direct invocation via `nix run`
        apps = {
          setup = {
            type = "app";
            program = toString (pkgs.writeShellScript "setup" ''
              ${pkgs.bun}/bin/bun install
            '');
          };

          dev-backend = {
            type = "app";
            program = toString (pkgs.writeShellScript "dev-backend" ''
              cd backend && ${pkgs.bun}/bin/bun run dev
            '');
          };

          dev-menu = {
            type = "app";
            program = toString (pkgs.writeShellScript "dev-menu" ''
              cd frontend-menu && ${pkgs.bun}/bin/bun run dev
            '');
          };

          dev-admin = {
            type = "app";
            program = toString (pkgs.writeShellScript "dev-admin" ''
              cd frontend-admin && ${pkgs.bun}/bin/bun run dev
            '');
          };
        };

        # Formatter for nix files
        formatter = pkgs.nixpkgs-fmt;
      }
    );
}
