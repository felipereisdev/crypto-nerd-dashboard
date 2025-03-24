#!/bin/bash

# Verifica se o ImageMagick está instalado
if ! command -v convert &> /dev/null; then
    echo "ImageMagick não está instalado. Por favor, instale-o primeiro."
    echo "No macOS: brew install imagemagick"
    echo "No Ubuntu/Debian: sudo apt-get install imagemagick"
    exit 1
fi

# Diretório onde os ícones serão salvos
ICONS_DIR="public/icons"

# Verifica se o diretório existe
if [ ! -d "$ICONS_DIR" ]; then
    mkdir -p "$ICONS_DIR"
fi

# Arquivo SVG de origem
SOURCE_SVG="$ICONS_DIR/icon-base.svg"

# Verifica se o arquivo SVG de origem existe
if [ ! -f "$SOURCE_SVG" ]; then
    echo "Arquivo SVG de origem não encontrado: $SOURCE_SVG"
    exit 1
fi

# Tamanhos de ícones a serem gerados
SIZES=(72 96 128 144 152 192 384 512)

# Gera ícones em diferentes tamanhos
for size in "${SIZES[@]}"; do
    echo "Gerando ícone ${size}x${size}..."
    convert -background none -size ${size}x${size} "$SOURCE_SVG" "$ICONS_DIR/icon-${size}x${size}.png"
done

echo "Todos os ícones foram gerados em $ICONS_DIR" 