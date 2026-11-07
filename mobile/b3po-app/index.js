/**
 * @format
 */

import { AppRegistry } from 'react-native'
import { createElement } from 'react'
import App from './App'
import { ErrorBoundary } from './src/app/error-boundary'
import { name as appName } from './app.json'

const Root = () => createElement(ErrorBoundary, null, createElement(App))

AppRegistry.registerComponent(appName, () => Root)
