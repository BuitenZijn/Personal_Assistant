/**
 * @pa/shared — platform-neutral helpers shared by web, mobile and map.
 *
 * Hard rule: this package has **no dependencies**. Nothing here may import
 * React, Expo, deck.gl, Tamagui or any native module, because the geo helpers
 * run inside the mobile background location task where none of those exist.
 */

export * from './geo'
export * from './format'
export * from './config'
