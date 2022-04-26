const Main = require('../../src/components/Main')

module.exports = {
  WidgetContainer: ({ location }) => (
    <>
      <h1>Hello World</h1>
      <Main location={location} />
    </>
  )
}
