import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { SourceJson, Wearable } from '../types'
import { outputTexturesFromGLB } from './outputTexturesFromGLB'

const defaultReplacementMatrix: { [key: string]: string[] } = {
  mask: ['eyewear', 'tiara', 'hat', 'helmet'],
  eyewear: ['mask', 'helmet'],
  tiara: ['mask', 'hat', 'helmet'],
  hat: ['mask', 'tiara', 'helmet', 'top_head'],
  top_head: ['hat', 'helmet'],
  helmet: ['mask', 'tiara', 'hat', 'top_head', 'eyewear'],
  hair: ['hat', 'helmet']
}

const defaultHidingMatrix: { [key: string]: string[] } = {
  mask: ['earring', 'facial_hair'],
  hat: ['hair'],
  helmet: ['eyewear', 'earrings', 'hair', 'facial_hair', 'head']
}

function transformJson(json: SourceJson): Wearable {
  return {
    id: json.name,
    type: 'wearable',
    category: json.category,
    i18n: Object.keys(json.i18n).reduce(
      (cumm, code) => {
        const text = json.i18n[code]
        cumm.push({ code, text })
        return cumm
      },
      [] as { code: string; text: string }[]
    ),
    thumbnail: '',
    baseUrl: '',
    tags: [...json.tags, 'exclusive'],
    replaces: json.replaces || defaultReplacementMatrix[json.category],
    hides: json.hides || defaultHidingMatrix[json.category],
    representations: json.main.map(original => ({
      bodyShapes: [original.type.startsWith('dcl://') ? original.type : 'dcl://base-avatars/' + original.type],
      mainFile: original.model,
      overrideReplaces: original.overrideReplaces || [],
      overrideHides: original.overrideHides || [],
      contents: []
    }))
  }
}

const hasExtension = (extension: string[] | string) => (file: string) =>
  typeof extension === 'string'
    ? file.endsWith(extension)
    : extension.reduce((prev, ext) => prev || file.endsWith(ext), false)
const GLB_ASSET = ['.glb']
const isGlbAsset = hasExtension(GLB_ASSET)

export async function processAsset(sourceFolder: string, destinationFolder: string) {
  const allFilesInAssetFolder = readdirSync(sourceFolder)
  const glbFileNames = allFilesInAssetFolder.filter(isGlbAsset)
  for (const glbFilename of glbFileNames) {
    const fullGlbFilepath = resolve(join(sourceFolder, glbFilename))
    try {
      await outputTexturesFromGLB(fullGlbFilepath, destinationFolder)
    } catch (err) {
      console.error(err.message)
    }
  }
  const json = JSON.parse(readFileSync(join(sourceFolder, 'asset.json')).toString()) as SourceJson
  const result: Wearable = transformJson(json)
  writeFileSync(join(destinationFolder, 'asset.json'), JSON.stringify(result, null, 2))
  return result
}
