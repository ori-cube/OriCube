#!/usr/bin/env bash
set -e

if command -v mise >/dev/null 2>&1; then
    echo "mise がすでにインストールされています。バージョン: $(mise --version)"
else
    echo "mise が見つかりません。インストールを試みます。"

    OS="$(uname -s)"
    case "$OS" in
        Darwin)
            if command -v brew >/dev/null 2>&1; then
                echo "Homebrew 検出: brew install mise を実行します。"
                brew install mise :contentReference[oaicite:0]{index=0}
            else
                echo "Homebrew が見つかりません。curl でインストールします。"
                curl https://mise.run | sh :contentReference[oaicite:1]{index=1}
            fi
            ;;
        Linux)
            if command -v apt-get >/dev/null 2>&1; then
                echo "Debian/Ubuntu 環境: sudo apt install -y mise を実行します。"
                sudo apt update && sudo apt install -y mise :contentReference[oaicite:2]{index=2}
            elif command -v dnf >/dev/null 2>&1; then
                echo "Fedora 環境: sudo dnf install -y mise を実行します。"
                sudo dnf install -y mise :contentReference[oaicite:3]{index=3}
            elif command -v apk >/dev/null 2>&1; then
                echo "Alpine 環境: sudo apk add mise を実行します。"
                sudo apk add mise :contentReference[oaicite:4]{index=4}
            else
                echo "サポートされているパッケージマネージャが見つかりません。curl でインストールします。"
                curl https://mise.run | sh :contentReference[oaicite:5]{index=5}
            fi
            ;;
        *)
            echo "未サポートの OS (${OS}) です。curl によるインストールを試みます。"
            curl https://mise.run | sh :contentReference[oaicite:6]{index=6}
            ;;
    esac

    export PATH="$HOME/.local/bin:$PATH"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc 2>/dev/null || true
fi

mise install

# bashに入るとmiseの設定が有効化されるはずです．（少なくとも河村はそう)
exec bash
