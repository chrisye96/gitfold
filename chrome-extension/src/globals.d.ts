// Allows importing .css files as string literals via the esbuild cssTextPlugin.
declare module '*.css' {
  const css: string
  export default css
}
