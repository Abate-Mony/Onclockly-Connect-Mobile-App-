/* global __dirname */
// Run: node --test scripts/test-styled-pressable.cjs
// RN Web is only the host renderer. Styles pass through the installed NATIVE
// NativeWind runtime, which is the boundary a plain web export never exercises.
const assert = require("node:assert/strict")
const { Buffer } = require("node:buffer")
const fs = require("node:fs")
const Module = require("node:module")
const path = require("node:path")
const { test, after } = require("node:test")
const babel = require("@babel/core")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const host = require("react-native-web")

const root = path.resolve(__dirname, "..")
const runtime = path.join(root, "node_modules/react-native-css-interop/dist/runtime")
const originalLoad = Module._load
const previousNodeEnv = process.env.NODE_ENV
process.env.NODE_ENV = "test"

// Match Metro's native API resolution while letting Node render host elements.
Module._load = function (request, parent, isMain) {
  if (request === "react-native") return host
  if (request === "./api" && parent?.filename === path.join(runtime, "wrap-jsx.js")) {
    return originalLoad.call(this, path.join(runtime, "native/api.js"), parent, isMain)
  }
  return originalLoad.call(this, request, parent, isMain)
}

const native = require(path.join(runtime, "native/api.js"))
native.cssInterop(host.Pressable, { className: "style" })
native.cssInterop(host.View, { className: "style" })
const { jsx } = require("nativewind/jsx-runtime")

const wrapperPath = path.join(root, "src/components/StyledPressable.tsx")
const { code } = babel.transformSync(fs.readFileSync(wrapperPath, "utf8"), {
  filename: wrapperPath,
  configFile: path.join(root, "babel.config.js"),
  caller: { name: "metro", bundler: "metro", platform: "ios", supportsStaticESM: false },
  envName: "test",
})
assert.match(code, /react-native-css-interop\/jsx-runtime/, "Compile the actual app's NativeWind JSX runtime")
const wrapperModule = new Module(wrapperPath, module)
wrapperModule.filename = wrapperPath
wrapperModule.paths = Module._nodeModulePaths(path.dirname(wrapperPath))
wrapperModule._compile(code, wrapperPath)
const { StyledPressable } = wrapperModule.exports

after(() => {
  Module._load = originalLoad
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = previousNodeEnv
})

const baseStyle = { backgroundColor: "#123456", flexDirection: "row", padding: 24 }
const styleCallback = ({ pressed }) => [baseStyle, pressed && { opacity: 0.72 }]
const label = () => React.createElement(host.Text, null, "View booking")

test("reproduces NativeWind native callback style loss while static styles survive", () => {
  const broken = renderToStaticMarkup(jsx(host.Pressable, { style: styleCallback, children: label() }))
  const staticStyle = renderToStaticMarkup(jsx(host.Pressable, { style: baseStyle, children: label() }))
  assert.doesNotMatch(broken, /background-color/)
  assert.match(staticStyle, /background-color:rgba\(18,52,86,1\.00\)/)
})

test("actual compiled StyledPressable preserves the native callback and consumes the opt-out", () => {
  const element = StyledPressable({ style: styleCallback, children: label() })
  assert.equal(element.type, host.Pressable)
  assert.equal(element.props.style, styleCallback)
  assert.equal("cssInterop" in element.props, false)
  assert.deepEqual(host.StyleSheet.flatten(element.props.style({ pressed: false })), baseStyle)
  assert.deepEqual(host.StyleSheet.flatten(element.props.style({ pressed: true })), { ...baseStyle, opacity: 0.72 })
  const html = renderToStaticMarkup(jsx(StyledPressable, { style: styleCallback, children: label() }))
  assert.match(html, /background-color:rgba\(18,52,86,1\.00\)/)
  assert.match(html, /flex-direction:row/)
  assert.match(html, /padding-left:24px/)
})

test("forwards accessibility, press events, refs and children callbacks unchanged", () => {
  const onPress = () => {}
  const onPressIn = () => {}
  const onPressOut = () => {}
  const ref = React.createRef()
  const children = ({ pressed }) => React.createElement(host.Text, null, pressed ? "Pressed" : "Ready")
  const accessibilityState = { disabled: false }
  const element = StyledPressable({
    style: styleCallback, children, onPress, onPressIn, onPressOut, ref,
    accessibilityRole: "button", accessibilityLabel: "View booking", accessibilityState,
  })
  for (const [key, value] of Object.entries({ children, onPress, onPressIn, onPressOut, ref, accessibilityState })) {
    assert.equal(element.props[key], value)
  }
  assert.equal(element.props.accessibilityRole, "button")
  assert.equal(element.props.accessibilityLabel, "View booking")
  assert.match(renderToStaticMarkup(element), /Ready/)
})

test("NativeWind className styling stays enabled for other components", () => {
  const { cssToReactNativeRuntime } = require("react-native-css-interop/dist/css-to-rn")
  native.StyleSheet.registerCompiled(cssToReactNativeRuntime(Buffer.from(".regression-wind { background-color: #654321; padding: 12px; }")))
  const html = renderToStaticMarkup(jsx(host.View, { className: "regression-wind" }))
  assert.match(html, /background-color:rgba\(101,67,33,1\.00\)/)
  assert.match(html, /padding-left:12px/)
})
