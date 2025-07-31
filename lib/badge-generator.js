class BadgeGenerator {
  constructor() {
    this.defaultStyle = 'flat';
    this.height = 20;
    this.fontSize = 11;
    this.fontFamily = 'Verdana,Geneva,DejaVu Sans,sans-serif';
  }

  generateSVG(label, message, color, options = {}) {
    const style = options.style || this.defaultStyle;
    const logo = options.logo || null;
    
    const labelWidth = this.calculateTextWidth(label);
    const messageWidth = this.calculateTextWidth(message);
    const logoWidth = logo ? 20 : 0;
    
    const padding = 24; // Increased padding for better spacing
    const totalWidth = labelWidth + messageWidth + logoWidth + padding;
    const labelX = (labelWidth + logoWidth) / 2 + 6;
    const messageX = labelWidth + logoWidth + messageWidth / 2 + 12; // Keep left spacing, reduce only right

    const svg = this.createSVGTemplate(totalWidth, style);
    const content = this.createSVGContent(
      label, message, color, labelWidth, messageWidth, 
      labelX, messageX, logoWidth, logo, style
    );

    return svg.replace('{{CONTENT}}', content);
  }

  createSVGTemplate(width, style) {
    const cornerRadius = style === 'flat' ? 0 : 3;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${this.height}" role="img" aria-label="{{LABEL}}: {{MESSAGE}}">
  <title>{{LABEL}}: {{MESSAGE}}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${width}" height="${this.height}" rx="${cornerRadius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    {{CONTENT}}
  </g>
</svg>`;
  }

  createSVGContent(label, message, color, labelWidth, messageWidth, labelX, messageX, logoWidth, logo, style) {
    const labelBgWidth = labelWidth + logoWidth + 12;
    const messageBgX = labelBgWidth;
    const messageBgWidth = messageWidth + 10; // Reduced right padding, more focus on left spacing
    
    let content = `
    <rect width="${labelBgWidth}" height="${this.height}" fill="#555"/>
    <rect x="${messageBgX}" width="${messageBgWidth}" height="${this.height}" fill="${color}"/>
    <rect width="${labelBgWidth + messageBgWidth}" height="${this.height}" fill="url(#s)"/>`;

    if (logo) {
      content += `
    <image x="5" y="3" width="14" height="14" xlink:href="data:image/svg+xml;base64,${this.getLogoData(logo)}"/>`;
    }

    content += `
    <g fill="#fff" text-anchor="middle" font-family="${this.fontFamily}" text-rendering="geometricPrecision" font-size="${this.fontSize}">
      <text aria-hidden="true" x="${labelX}" y="15" fill="#010101" fill-opacity=".3">${this.escapeXml(label)}</text>
      <text x="${labelX}" y="14" fill="#fff">${this.escapeXml(label)}</text>
      <text aria-hidden="true" x="${messageX}" y="15" fill="#010101" fill-opacity=".3">${this.escapeXml(message)}</text>
      <text x="${messageX}" y="14" fill="#fff">${this.escapeXml(message)}</text>
    </g>`;

    return content;
  }

  calculateTextWidth(text) {
    // More accurate character width mapping for better text rendering
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = char.charCodeAt(0);
      
      // Narrow characters
      if (char === 'i' || char === 'l' || char === 'I' || char === '1' || char === '.' || char === ',' || 
          char === ':' || char === ';' || char === '\'' || char === '"' || char === '`') {
        width += 4;
      }
      // Wide characters (uppercase letters, numbers, special chars)
      else if (char.match(/[A-Z0-9MW@#$%&*()_+={}|[\]\\:";'<>?,.\/~`]/) || code > 127) {
        width += 7.5;
      }
      // Regular lowercase letters
      else {
        width += 6;
      }
    }
    
    return Math.ceil(width);
  }

  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  getLogoData(logoName) {
    const logos = {
      translate: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bS0xIDEzaC0xdjFzMCAxIC0xIDFoLTJzLTEgMC0xLTF2LTFoLTFzLTEgMC0xLTF2LTFzMC0xIDEtMWgxdi0xczAtMSAxLTFoMnMxIDAgMSAxdjFoMXMxIDAgMSAxdjFzMCAxLTEgMXptNS02aC0xdjFzMCAxLTEgMWgtMnMtMSAwLTEtMXYtMWgtMXMtMSAwLTEtMXYtMXMwLTEgMS0xaDIuNXMxIDAgMSAxdjFoMS41czEgMCAxIDF2MXMwIDEtMSAxeiIvPjwvc3ZnPg==',
      github: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTEyIDJBMTAgMTAgMCAwIDAgMiAxMmMwIDQuNDIgMi44NzUgOC4xNyA2Ljg0IDkuNDlsLjUtLjA4Yy4zLS4wNS41LS4yNy41LS41NHYtMS45NWMtMi43NCAwLTMuMjctMS4zNS0zLjQ4LTEuOGEzIDMgMCAwIDAtLjg4LTEuNThjLS4zLS4yNC0uNy0uODQtLjAxLS44NSAyLjc1IDAgMy42NyAyLjQ1IDMuNjcgMi40NXMxLjczIDMuMDIgNCA2IDMtMS4zIDMtMS4zOWMwLS4xNC4xLS4yNy4yNS0uMzZhMy4xOCAzLjE4IDAgMCAwIDEuNjktMS4xYy0yLjY3IDAtNS4yNi0xLjIyLTUuMjYtNS44MyAwLTEuMjcuNDItMi4zIDEuMTMtMy4wOC0uMTEtLjI1LS40OS0xLjMuMTEtMi43MS4xLS4wNy4yMi0uMTEuMzQtLjExaC4xMWMyIDAgMy4zIDEuMjcgMy4zIDEuMjcgMSAyLjA4IDMgMi4yMyA0IDIuMjNzMy0uMTUgNC0yLjIzYzAtMCAzLjMtMS4yNyAzLjMtMS4yN2gyLjExYzEgMCAxIDEgMSAxIi8+PC9zdmc+'
    };
    
    return logos[logoName] || logos.translate;
  }

  generateErrorBadge(errorType, options = {}) {
    const errorMessages = {
      'REPO_NOT_FOUND': 'repository not found',
      'NO_I18N_FILES': 'no translations found',
      'INVALID_PATH': 'invalid path',
      'RATE_LIMITED': 'rate limited',
      'UNAVAILABLE': 'service unavailable',
      'LANGUAGE_NOT_FOUND': 'language not found'
    };

    const message = errorMessages[errorType] || 'error';
    return this.generateSVG('i18n', message, '#e05d44', options);
  }
}

module.exports = BadgeGenerator;