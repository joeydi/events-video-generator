export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Four-point sparkle used across the Disco designs.
export const star = (size, color, style = '', role = '') =>
  `<svg${role ? ` data-role="${role}"` : ''} width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="flex: none; color: ${color}; ${style}"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" fill="currentColor"></path></svg>`;

export const arrow = (size, strokeWidth) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="flex: none"><path d="M4 12H19M13 6L19 12L13 18" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="square"></path></svg>`;
