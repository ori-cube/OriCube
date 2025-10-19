import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";

// Reactをグローバルに設定
global.React = React;

// HTMLCanvasElementのgetContextメソッドをモック
const mockWebGLContext = {
  getExtension: vi.fn(() => null),
  getParameter: vi.fn((param) => {
    switch (param) {
      case 0x1f02: // VERSION
        return "WebGL 1.0";
      case 0x8b8c: // MAX_VERTEX_TEXTURE_IMAGE_UNITS
        return 16;
      case 0x8872: // MAX_TEXTURE_SIZE
        return 4096;
      default:
        return null;
    }
  }),
  getProgramParameter: vi.fn(() => true),
  getShaderParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ""),
  getShaderPrecisionFormat: vi.fn(() => ({
    precision: 1,
    rangeMax: 1,
    rangeMin: 1,
  })),
  createShader: vi.fn(() => ({})),
  createProgram: vi.fn(() => ({})),
  attachShader: vi.fn(),
  compileShader: vi.fn(),
  linkProgram: vi.fn(),
  useProgram: vi.fn(),
  getAttribLocation: vi.fn(() => 0),
  getUniformLocation: vi.fn(() => null),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  uniform1f: vi.fn(),
  uniform1i: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  createBuffer: vi.fn(() => ({})),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  createTexture: vi.fn(() => ({})),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  generateMipmap: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  depthFunc: vi.fn(),
  clearColor: vi.fn(),
  clearDepth: vi.fn(),
  clear: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  viewport: vi.fn(),
  scissor: vi.fn(),
  canvas: {
    width: 100,
    height: 100,
  },
  // WebGL Constants
  VERSION: 0x1f02,
  VERTEX_SHADER: 0x8b31,
  FRAGMENT_SHADER: 0x8b30,
  HIGH_FLOAT: 0x8df2,
  MEDIUM_FLOAT: 0x8df1,
  LOW_FLOAT: 0x8df0,
  DEPTH_TEST: 0x0b71,
  COLOR_BUFFER_BIT: 0x00004000,
  DEPTH_BUFFER_BIT: 0x00000100,
  TRIANGLES: 0x0004,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b8c,
  MAX_TEXTURE_SIZE: 0x8872,
};

HTMLCanvasElement.prototype.getContext = vi.fn((contextId) => {
  if (
    contextId === "webgl" ||
    contextId === "webgl2" ||
    contextId === "experimental-webgl"
  ) {
    return mockWebGLContext as unknown as WebGLRenderingContext;
  }
  return {
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(4),
    })),
    putImageData: vi.fn(),
    canvas: {
      width: 100,
      height: 100,
    },
  };
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// windowオブジェクトのモック
Object.defineProperty(window, "devicePixelRatio", {
  writable: true,
  value: 1,
});

// requestAnimationFrameのモック
global.requestAnimationFrame = vi.fn((cb) => cb(0));
