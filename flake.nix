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
      in
      {
        devShells.default = pkgs.mkShell {
          name = "live-menu-cf";

          buildInputs = with pkgs; [
            # Core runtime
            bun              # JavaScript runtime and package manager
            nodejs           # Node.js (required by some tools)

            # Playwright browsers (for e2e tests)
            playwright-driver.browsers

            # Cloudflare tools
            # wrangler is managed via package.json (node_modules/.bin)

            # Development tools
            git              # Version control
            openssl          # Crypto utilities
            curl             # API testing
            jq               # JSON processing

            # Database inspection
            sqlite           # D1 local database inspection
          ];

          shellHook = ''
            # Use project-local wrangler (keeps version in sync with package.json)
            export PATH="$PWD/node_modules/.bin:$PATH"

            # Playwright: point to the Nix-managed Chromium binary
            export PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH="${pkgs.playwright-driver.browsers}/chromium-${chromium-rev}/chrome-linux64/chrome"

            echo "Live Menu CF — Development Environment"
            echo "======================================="
            echo ""
            echo "Available tools:"
            echo "  bun      $(bun --version)"
            echo "  node     $(node --version)"
            echo "  wrangler $(wrangler --version 2>/dev/null || echo '(run: bun install)')"
            echo "  sqlite3  $(sqlite3 --version)"
            echo "  curl     $(curl --version | head -1)"
            echo "  jq       $(jq --version)"
            echo ""
            echo "Quick start:"
            echo "  1. bun install              Install all workspace dependencies"
            echo "  2. dev-backend              Start the Hono API worker"
            echo "  3. dev-menu                 Start the menu frontend"
            echo "  4. dev-admin                Start the admin frontend"
            echo "  5. e2e                      Run Playwright tests"
            echo ""
            echo "Aliases:"
            echo "  dev-backend    cd backend && bun run dev"
            echo "  dev-menu       cd frontend-menu && bun run dev"
            echo "  dev-admin      cd frontend-admin && bun run dev"
            echo "  db             wrangler d1 <subcommand>"
            echo "  e2e            cd e2e && bunx playwright test"
            echo ""

            # Project-specific aliases
            alias dev-backend="cd $PWD/backend && bun run dev"
            alias dev-menu="cd $PWD/frontend-menu && bun run dev"
            alias dev-admin="cd $PWD/frontend-admin && bun run dev"
            alias db="wrangler d1"
            alias e2e="cd $PWD/e2e && bunx playwright test"
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
